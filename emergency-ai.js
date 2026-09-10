// 재운컴퍼니 PWA 비상 AI: 원격 연결이 끊겨도 대화·개발지시 보존·복구 전송을 유지한다.
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
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let remoteState=navigator.onLine?'checking':'emergency';
let probing=false,replaying=false,lastProbe=0;
function readJson(key,fallback){try{const v=JSON.parse(localStorage.getItem(key)||'');return v??fallback;}catch{return fallback;}}
function writeJson(key,value){try{localStorage.setItem(key,JSON.stringify(value));}catch{}}
function queue(){const q=readJson(QUEUE_KEY,[]);return Array.isArray(q)?q:[];}
function history(){const h=readJson(HISTORY_KEY,[]);return Array.isArray(h)?h:[];}
function saveHistory(rows){writeJson(HISTORY_KEY,rows.slice(-80));}
function ensureUi(){
  if(!$('networkMode')){
    const bar=document.createElement('div');bar.id='networkMode';bar.setAttribute('role','status');bar.style.cssText='width:min(calc(100% - 24px),760px);margin:0 auto 3px;padding:5px 10px;border-radius:10px;text-align:center;font-size:12px;line-height:1.35;color:#aaa9a4;background:#2b2b2a;display:none';
    document.querySelector('.top')?.appendChild(bar);
  }
  if(!$('emergencyHistory')){
    const box=document.createElement('div');box.id='emergencyHistory';
    $('chat')?.appendChild(box);
  }
  renderEmergencyHistory();updateModeUi();
}
function updateModeUi(){
  const bar=$('networkMode');if(!bar)return;
  const n=queue().length;
  if(remoteState==='online'){bar.style.display=n?'block':'none';bar.style.color='#b8e8c8';bar.textContent=n?`온라인 복구됨 · 대기 지시 ${n}건 전송 준비`:'온라인 AI';}
  else if(remoteState==='checking'){bar.style.display='block';bar.style.color='#e6c889';bar.textContent='연결 확인 중…';}
  else{bar.style.display='block';bar.style.color='#e6c889';bar.textContent=`비상 AI · 원격 연결 차단/오프라인 감지${n?` · 지시 ${n}건 대기`:''}`;}
}
function currentGame(){return localStorage.getItem(GAME_KEY)||'';}
function currentGameName(){const id=currentGame();if(!id)return'회사 공통';const btn=document.querySelector(`.gameItem[data-game="${CSS.escape(id)}"] .gameName`);return btn?.textContent?.trim()||$('brand')?.textContent?.trim()||id;}
function addLocal(sender,body,kind='chat'){
  const rows=history();rows.push({id:crypto.randomUUID(),sender,body:String(body).slice(0,3000),kind,gameId:currentGame(),gameName:currentGameName(),createdAt:new Date().toISOString()});saveHistory(rows);renderEmergencyHistory();
}
function renderEmergencyHistory(){
  const box=$('emergencyHistory');if(!box)return;const rows=history();if(!rows.length){box.innerHTML='';return;}
  box.innerHTML='<div class="group"><div class="groupTitle">비상 AI · 기기 보존 대화</div>'+rows.map(r=>`<div class="${r.sender==='owner'?'bubble owner':'bubble company ai'}">${esc(r.body)}</div>`).join('')+'</div>';
  requestAnimationFrame(()=>{const chat=$('chat');if(chat)chat.scrollTop=chat.scrollHeight;});
}
function cachedContext(){return readJson(CONTEXT_KEY,{catalog:null,status:null,savedAt:''});}
function compactCurrentStatus(){
  const ctx=cachedContext(),id=currentGame();const games=Array.isArray(ctx?.catalog?.games)?ctx.catalog.games:[];const g=id?games.find(x=>x?.id===id):null;
  if(g)return `${g.name||id} · ${g.homepageStage||g.productionTarget||'상태 정보 있음'}`;
  const focus=ctx?.status?.operations?.autonomousFocus?.games;const f=Array.isArray(focus)&&focus.length?focus[0]:null;
  if(f)return `현재 집중개발: ${f.name||f.slug||f.gameId}${f.lane?` · ${f.lane}`:''}`;
  return id?`${currentGameName()} 선택됨`:'마지막 온라인 게임 상태 캐시가 아직 없어.';
}
function localReply(text){
  const qn=queue().length;
  if(EXEC_RE.test(text))return `개발 지시를 이 휴대폰에 안전하게 대기 저장했어. 원격 연결이 돌아오면 Vibe2로 자동 전달할게.${qn?` 현재 대기 ${qn}건.`:''}`;
  if(/(차단|공격|연결|인터넷|네트워크|왜.*안|먹통)/.test(text))return `지금 원격 연결 차단 또는 오프라인 상태로 감지돼. 우회하지 않고 비상 AI로 계속 대화 중이야. 개발 지시는 기기에 보존하고 연결 복구 뒤 자동 전송해.`;
  if(/(현재|지금|개발.*게임|게임.*상태|뭐.*개발|어떤.*게임)/.test(text))return `${compactCurrentStatus()} 이 정보는 마지막 온라인 상태 캐시 기준이야.`;
  if(/(대기|큐|보낸.*지시|저장)/.test(text))return qn?`현재 Vibe2 전송 대기 지시가 ${qn}건 있어. 연결되면 순서대로 보낼게.`:'현재 전송 대기 지시는 없어.';
  if(/^(안녕|야|뭐해|있어|대답|응답)/.test(text.trim()))return '응. 지금 비상 AI가 기기 안에서 응답하고 있어. 원격 Gemini가 끊겨도 개발 요구 정리와 지시 저장은 계속 가능해.';
  return '지금은 로컬 비상 AI 모드라 Gemini보다 답변 범위가 제한돼. 그래도 현재 게임 상태 확인, 요구사항 정리, 개발 지시 대기 저장, 연결 상태 확인은 계속 할 수 있어. 실제 수정 지시는 “진행/수정해/적용해”처럼 말하면 저장해둘게.';
}
function enqueueDirective(text){const q=queue();q.push({id:crypto.randomUUID(),text:String(text).slice(0,3000),gameId:currentGame(),priority:$('priority')?.value||'normal',createdAt:new Date().toISOString()});writeJson(QUEUE_KEY,q.slice(-30));updateModeUi();}
function emergencySend(event){
  if(remoteState==='online')return;const body=$('body');if(!body)return;let text=body.value.trim();if(!text)return;
  event?.preventDefault?.();event?.stopImmediatePropagation?.();
  body.value='';body.dispatchEvent(new Event('input',{bubbles:true}));addLocal('owner',text);
  if(EXEC_RE.test(text))enqueueDirective(text);
  addLocal('ai',localReply(text));
}
async function cacheContext(){
  if(remoteState!=='online')return;
  try{const [cr,sr]=await Promise.all([fetch(`/game-catalog.json?emergency=${Date.now()}`,{cache:'no-store'}),fetch(`/company-status.json?emergency=${Date.now()}`,{cache:'no-store'})]);if(!cr.ok||!sr.ok)return;const [catalog,status]=await Promise.all([cr.json(),sr.json()]);writeJson(CONTEXT_KEY,{catalog,status,savedAt:new Date().toISOString()});}catch{}
}
async function probe(force=false){
  const now=Date.now();if(probing||(!force&&now-lastProbe<8000))return;lastProbe=now;
  if(!navigator.onLine){setState('emergency');return;}
  const token=localStorage.getItem(TOKEN_KEY)||'';if(!token){setState('online');return;}
  probing=true;const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),3500);
  try{
    const res=await fetch(CHAT_API,{method:'POST',headers:{'Content-Type':'application/json','apikey':API_KEY,'x-jaewoon-device':token},body:'{"action":"status"}',cache:'no-store',signal:controller.signal});
    // HTTP 응답이 왔다는 것 자체가 원격 경로가 살아 있다는 뜻이다.
    setState('online');if(res.ok)cacheContext();
  }catch{setState('emergency');}finally{clearTimeout(timer);probing=false;}
}
function setState(next){const changed=remoteState!==next;remoteState=next;updateModeUi();if(next==='online'){if(changed)addLocal('ai','원격 연결이 복구됐어. 비상 모드에서 저장한 개발 지시를 Vibe2로 전달할게.','system');flushQueue();}else if(changed){addLocal('ai','원격 연결이 끊긴 걸 감지했어. 비상 AI로 전환했어. 여기서 계속 말하면 되고, 실제 개발 지시는 기기에 저장할게.','system');}}
async function waitOriginalSend(){
  const started=Date.now();while(Date.now()-started<15000){await new Promise(r=>setTimeout(r,350));const pending=document.querySelector('.pendingAi');const err=$('runtimeError');if(!pending){if(err&&!err.hidden&&err.textContent.trim())return false;return true;}}return false;
}
async function flushQueue(){
  if(replaying||remoteState!=='online'||!queue().length||document.hidden)return;
  const body=$('body');if(!body||body.value.trim()||document.querySelector('.pendingAi')||document.querySelector('#attachTray')?.children.length)return;
  replaying=true;
  try{
    while(remoteState==='online'){
      const q=queue();if(!q.length)break;const item=q[0];
      if(item.gameId){const game=document.querySelector(`.gameItem[data-game="${CSS.escape(item.gameId)}"]`);game?.click();}
      const priority=$('priority');if(priority)priority.value=item.priority||'normal';
      body.value=`[비상 AI 대기 지시]\n${item.text}`;body.dispatchEvent(new Event('input',{bubbles:true}));
      $('sendBtn')?.click();const ok=await waitOriginalSend();if(!ok){setState('emergency');break;}
      const latest=queue();if(latest[0]?.id===item.id){latest.shift();writeJson(QUEUE_KEY,latest);}addLocal('ai','대기 중이던 개발 지시 1건을 온라인 Vibe2로 전달했어.','system');updateModeUi();await new Promise(r=>setTimeout(r,500));
    }
  }finally{replaying=false;updateModeUi();}
}
function installCapture(){
  $('sendBtn')?.addEventListener('click',emergencySend,true);
  $('body')?.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&remoteState!=='online')emergencySend(e);},true);
}
function boot(){ensureUi();installCapture();probe(true);setInterval(()=>probe(false),10000);setInterval(()=>{if(remoteState==='online')flushQueue();},5000);window.addEventListener('online',()=>probe(true));window.addEventListener('offline',()=>setState('emergency'));document.addEventListener('visibilitychange',()=>{if(!document.hidden)probe(true);});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
