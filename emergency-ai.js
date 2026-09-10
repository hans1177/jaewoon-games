// 재운컴퍼니 PWA 비상 AI: 원격 연결이 끊겨도 ChatGPT식 대화 흐름으로 개발 대화를 이어간다.
(()=>{
'use strict';
const CHAT_API='https://njpexgqvituaxrjpnqsi.supabase.co/functions/v1/company-ai-chat';
const API_KEY='sb_publishable_ybAF71npJQz6PJVpnwsQ4g_rsyzlkFQ';
const TOKEN_KEY='jaewoon_command_device_v1';
const GAME_KEY='jaewoon_ai_chat_game_v1';
const QUEUE_KEY='jaewoon_emergency_queue_v1';
const HISTORY_KEY='jaewoon_emergency_history_v1';
const CONTEXT_KEY='jaewoon_emergency_context_v1';
const EXEC_RE=/(진행|수정해|고쳐|만들어|적용해|반영해|개발해|추가해|삭제해|작업해|테스트해|바꿔|넣어|빼줘|해줘|처리해)/;
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
let remoteState=navigator.onLine?'checking':'emergency';
let probing=false,replaying=false,lastProbe=0,brandObserver=null,followLatest=true;
function readJson(key,fallback){try{const v=JSON.parse(localStorage.getItem(key)||'');return v??fallback;}catch{return fallback;}}
function writeJson(key,value){try{localStorage.setItem(key,JSON.stringify(value));}catch{}}
function queue(){const q=readJson(QUEUE_KEY,[]);return Array.isArray(q)?q:[];}
function history(){const h=readJson(HISTORY_KEY,[]);return Array.isArray(h)?h:[];}
function saveHistory(rows){writeJson(HISTORY_KEY,rows.slice(-80));}
function visibleHistory(){return history().filter(r=>r&&r.kind!=='system'&&r.sender!=='system');}
function modeLabel(){const n=queue().length;if(remoteState==='online')return `기본 모드${n?` · 대기 ${n}`:''}`;if(remoteState==='checking')return '재연결 중';return `비상 AI 모드${n?` · 대기 ${n}`:''}`;}
function syncScrollButton(){const chat=$('chat'),btn=$('scrollToBottomBtn');if(!chat||!btn)return;btn.hidden=followLatest||chat.scrollHeight<=chat.clientHeight+96;}
function scrollLatest(force=false){const chat=$('chat');if(!chat||(!force&&!followLatest)){syncScrollButton();return;}requestAnimationFrame(()=>{chat.scrollTop=chat.scrollHeight;followLatest=true;syncScrollButton();});}
function installChatFlow(){
  const chat=$('chat');if(!chat||chat.dataset.gptFlow==='1')return;chat.dataset.gptFlow='1';
  if(typeof window.scrollBottom==='function'&&!window.__jaewoonOriginalScrollBottom){window.__jaewoonOriginalScrollBottom=window.scrollBottom;window.scrollBottom=()=>scrollLatest(false);}
  chat.addEventListener('scroll',()=>{followLatest=chat.scrollHeight-chat.scrollTop-chat.clientHeight<96;syncScrollButton();},{passive:true});
  const observer=new MutationObserver(()=>{scrollLatest(false);syncScrollButton();});observer.observe(chat,{childList:true,subtree:true,characterData:true});
  const vv=window.visualViewport;if(vv){const sync=()=>setTimeout(()=>scrollLatest(true),40);vv.addEventListener('resize',sync);vv.addEventListener('scroll',sync);}
  $('body')?.addEventListener('focus',()=>setTimeout(()=>scrollLatest(true),80));
  syncScrollButton();
}
function ensureUi(){
  $('networkMode')?.remove();
  if(!$('emergencyHistory')){const box=document.createElement('div');box.id='emergencyHistory';$('chat')?.appendChild(box);}
  if(!$('gptEmergencyStyle')){const style=document.createElement('style');style.id='gptEmergencyStyle';style.textContent='.groupTitle{display:none!important}#emergencyHistory .group{margin-bottom:22px}.bubble{font-size:18px!important}.composer textarea{font-size:18px!important}#scrollToBottomBtn{position:absolute;left:50%;top:-43px;z-index:30;width:38px;height:38px;transform:translateX(-50%);border:1px solid #4c4c4a;border-radius:50%;background:#30302f;color:#deddd8;display:flex;align-items:center;justify-content:center;font-size:23px;line-height:1;box-shadow:0 4px 14px #0008}#scrollToBottomBtn:active{background:#3b3b39}#scrollToBottomBtn[hidden]{display:none!important}';document.head.appendChild(style);}
  if(!$('scrollToBottomBtn')){const composer=$('composer');if(composer){const btn=document.createElement('button');btn.id='scrollToBottomBtn';btn.type='button';btn.setAttribute('aria-label','맨 아래로');btn.textContent='↓';btn.hidden=true;btn.addEventListener('click',()=>{followLatest=true;scrollLatest(true);});composer.prepend(btn);}}
  const brand=$('brand');if(brand&&!brandObserver){brandObserver=new MutationObserver(()=>{const wanted=modeLabel();if(brand.textContent!==wanted)brand.textContent=wanted;});brandObserver.observe(brand,{childList:true,characterData:true,subtree:true});}
  // 이전 버전이 남긴 긴 상태문구는 보존하되 화면에서는 제거한다.
  const cleaned=history().filter(r=>r&&r.kind!=='system'&&r.sender!=='system');if(cleaned.length!==history().length)saveHistory(cleaned);
  installChatFlow();renderEmergencyHistory();updateModeUi();
}
function updateModeUi(){const brand=$('brand');if(!brand)return;const wanted=modeLabel();if(brand.textContent!==wanted)brand.textContent=wanted;brand.dataset.mode=remoteState;}
function currentGame(){return localStorage.getItem(GAME_KEY)||'';}
function currentGameName(){const id=currentGame();if(!id)return'회사 공통';const btn=document.querySelector(`.gameItem[data-game="${CSS.escape(id)}"] .gameName`);return btn?.textContent?.trim()||id;}
function addLocal(sender,body,kind='chat'){const rows=history();rows.push({id:crypto.randomUUID(),sender,body:String(body).slice(0,3000),kind,gameId:currentGame(),gameName:currentGameName(),createdAt:new Date().toISOString()});saveHistory(rows);followLatest=true;renderEmergencyHistory();}
function renderEmergencyHistory(){const box=$('emergencyHistory');if(!box)return;const rows=visibleHistory();if(!rows.length){box.innerHTML='';return;}box.innerHTML='<div class="group">'+rows.map(r=>`<div class="${r.sender==='owner'?'bubble owner':'bubble company ai'}">${esc(r.body)}</div>`).join('')+'</div>';scrollLatest(false);}
function cachedContext(){return readJson(CONTEXT_KEY,{catalog:null,status:null,savedAt:''});}
function compactCurrentStatus(){const ctx=cachedContext(),id=currentGame();const games=Array.isArray(ctx?.catalog?.games)?ctx.catalog.games:[];const g=id?games.find(x=>x?.id===id):null;if(g)return `${g.name||id} · ${g.homepageStage||g.productionTarget||'상태 정보 있음'}`;const focus=ctx?.status?.operations?.autonomousFocus?.games;const f=Array.isArray(focus)&&focus.length?focus[0]:null;if(f)return `현재 집중개발: ${f.name||f.slug||f.gameId}${f.lane?` · ${f.lane}`:''}`;return id?`${currentGameName()} 선택됨`:'마지막 온라인 게임 상태 캐시가 아직 없어.';}
function localReply(text){const qn=queue().length;if(EXEC_RE.test(text))return `지시 저장했어. 연결되면 Vibe2로 자동 전달할게.${qn?` 대기 ${qn}건.`:''}`;if(/(차단|공격|연결|인터넷|네트워크|왜.*안|먹통)/.test(text))return '원격 연결이 끊겨 비상 AI 모드야. 여기서 계속 대화하면 돼.';if(/(현재|지금|개발.*게임|게임.*상태|뭐.*개발|어떤.*게임)/.test(text))return `${compactCurrentStatus()} 마지막 온라인 상태 기준이야.`;if(/(대기|큐|보낸.*지시|저장)/.test(text))return qn?`Vibe2 전송 대기 ${qn}건 있어.`:'전송 대기 지시는 없어.';if(/^(안녕|야|뭐해|있어|대답|응답)/.test(text.trim()))return '응. 비상 AI로 연결돼 있어.';return '비상 AI 모드야. 요구사항은 계속 정리할 수 있고, 실제 개발 지시는 연결 복구 뒤 Vibe2로 자동 전달해.';}
function enqueueDirective(text){const q=queue();q.push({id:crypto.randomUUID(),text:String(text).slice(0,3000),gameId:currentGame(),priority:$('priority')?.value||'normal',createdAt:new Date().toISOString()});writeJson(QUEUE_KEY,q.slice(-30));updateModeUi();}
function emergencySend(event){if(remoteState==='online')return;const body=$('body');if(!body)return;const text=body.value.trim();if(!text)return;event?.preventDefault?.();event?.stopImmediatePropagation?.();followLatest=true;body.value='';body.dispatchEvent(new Event('input',{bubbles:true}));addLocal('owner',text);if(EXEC_RE.test(text))enqueueDirective(text);addLocal('ai',localReply(text));scrollLatest(true);}
async function cacheContext(){if(remoteState!=='online')return;try{const [cr,sr]=await Promise.all([fetch(`/game-catalog.json?emergency=${Date.now()}`,{cache:'no-store'}),fetch(`/company-status.json?emergency=${Date.now()}`,{cache:'no-store'})]);if(!cr.ok||!sr.ok)return;const [catalog,status]=await Promise.all([cr.json(),sr.json()]);writeJson(CONTEXT_KEY,{catalog,status,savedAt:new Date().toISOString()});}catch{}}
async function probe(force=false){const now=Date.now();if(probing||(!force&&now-lastProbe<8000))return;lastProbe=now;if(!navigator.onLine){setState('emergency');return;}const token=localStorage.getItem(TOKEN_KEY)||'';if(!token){setState('online');return;}probing=true;const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),3500);if(remoteState!=='emergency'){remoteState='checking';updateModeUi();}try{const res=await fetch(CHAT_API,{method:'POST',headers:{'Content-Type':'application/json','apikey':API_KEY,'x-jaewoon-device':token},body:'{"action":"status"}',cache:'no-store',signal:controller.signal});const contentType=res.headers.get('content-type')||'';const data=res.ok&&contentType.includes('application/json')?await res.json().catch(()=>null):null;if(!res.ok||!data||data.ok!==true){setState('emergency');return;}setState('online');cacheContext();}catch{setState('emergency');}finally{clearTimeout(timer);probing=false;}}
function setState(next){const previous=remoteState;remoteState=next;updateModeUi();if(next==='online'){flushQueue();}else if(next==='emergency'&&previous!=='emergency'){scrollLatest(false);}}
async function waitOriginalSend(){const started=Date.now();while(Date.now()-started<15000){await new Promise(r=>setTimeout(r,350));const pending=document.querySelector('.pendingAi');const err=$('runtimeError');if(!pending){if(err&&!err.hidden&&err.textContent.trim())return false;return true;}}return false;}
async function flushQueue(){if(replaying||remoteState!=='online'||!queue().length||document.hidden)return;const body=$('body');if(!body||body.value.trim()||document.querySelector('.pendingAi')||document.querySelector('#attachTray')?.children.length)return;replaying=true;updateModeUi();try{while(remoteState==='online'){const q=queue();if(!q.length)break;const item=q[0];if(item.gameId){const game=document.querySelector(`.gameItem[data-game="${CSS.escape(item.gameId)}"]`);game?.click();}const priority=$('priority');if(priority)priority.value=item.priority||'normal';followLatest=true;body.value=`[비상 AI 대기 지시]\n${item.text}`;body.dispatchEvent(new Event('input',{bubbles:true}));$('sendBtn')?.click();const ok=await waitOriginalSend();if(!ok){setState('emergency');break;}const latest=queue();if(latest[0]?.id===item.id){latest.shift();writeJson(QUEUE_KEY,latest);}updateModeUi();await new Promise(r=>setTimeout(r,500));}}finally{replaying=false;updateModeUi();}}
function installCapture(){$('sendBtn')?.addEventListener('click',e=>{followLatest=true;emergencySend(e);},true);$('body')?.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){followLatest=true;if(remoteState!=='online')emergencySend(e);}},true);}
function boot(){ensureUi();installCapture();probe(true);setInterval(()=>probe(false),10000);setInterval(()=>{if(remoteState==='online')flushQueue();},5000);window.addEventListener('online',()=>probe(true));window.addEventListener('offline',()=>setState('emergency'));document.addEventListener('visibilitychange',()=>{if(!document.hidden){followLatest=true;probe(true);scrollLatest(true);}});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
