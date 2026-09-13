import { JaewoonVibeRuntime } from '../../assets/vibe-runtime.js';
import { IslandRendererV3 } from './render-v3.js';

const WORKER_MAX=3, PRODUCE_SECONDS=5, DELIVERY_SECONDS=60, FEED_SECONDS=180, FEED_COST=10;
const LUMBER={x:245,y:850,wood:3,stone:1,radius:108};
const MINE={x:785,y:965,wood:2,stone:3,radius:108};
const FARM={x1:900,y1:340,x2:1180,y2:555};
let currentGame=null, activeRuntime=null, lastTick=performance.now(), lastUi=0;
let lastTap={time:0,x:0,y:0}, lastHandledAt=0;

const originalLoadProgress=JaewoonVibeRuntime.prototype.loadProgress;
const originalQueueSaveProgress=JaewoonVibeRuntime.prototype.queueSaveProgress;

function workerNumber(v){return Math.max(0,Math.floor(Number(v&&typeof v==='object'?v.count:v)||0));}
function ensureProduction(state){
  if(!state||typeof state!=='object')return null;
  let p=state.productionBuildings;
  if(!p||typeof p!=='object') p=state.productionBuildings={};
  if(!p._v2){
    p.lumberBuilt=Boolean(p.lumberBuilt); p.mineBuilt=Boolean(p.mineBuilt);
    p.lumberWorker=p.lumberWorker?1:0; p.mineWorker=p.mineWorker?1:0;
    for(const k of ['lumberTimer','mineTimer','playerLumberTimer','playerMineTimer','deliveryTimer','assignedFeedTimer']) p[k]=Math.max(0,Number(p[k])||0);
    p.bufferWood=Math.max(0,Math.floor(Number(p.bufferWood)||0));
    p.bufferStone=Math.max(0,Math.floor(Number(p.bufferStone)||0));
    if(!p.legacyMigrated){
      const old=state.workerStorage;
      if(old&&state.inventory){state.inventory.wood=(Number(state.inventory.wood)||0)+Math.max(0,Math.floor(Number(old.wood)||0));state.inventory.stone=(Number(state.inventory.stone)||0)+Math.max(0,Math.floor(Number(old.stone)||0));old.wood=0;old.stone=0;}
      p.legacyMigrated=true;
    }
    Object.defineProperty(p,'_v2',{value:true,writable:true,enumerable:false,configurable:true});
  }
  return p;
}
function reconcileWorkers(state){
  const p=ensureProduction(state); if(!p)return;
  let farm=workerNumber(state.workers), assigned=(p.lumberWorker?1:0)+(p.mineWorker?1:0);
  if(assigned>WORKER_MAX){p.mineWorker=0;assigned=p.lumberWorker?1:0;}
  if(farm+assigned>WORKER_MAX){farm=Math.max(0,WORKER_MAX-assigned);state.workers=farm;}
  state.workerTotal=Math.min(WORKER_MAX,farm+assigned);
}
JaewoonVibeRuntime.prototype.loadProgress=function(fallback={}){const s=originalLoadProgress.call(this,fallback);activeRuntime=this;ensureProduction(s);reconcileWorkers(s);return s;};
JaewoonVibeRuntime.prototype.queueSaveProgress=function(state,delay){activeRuntime=this;reconcileWorkers(state);return originalQueueSaveProgress.call(this,state,delay);};
function save(){if(!currentGame)return;reconcileWorkers(currentGame.state);activeRuntime?.queueSaveProgress(currentGame.state);}
function totalWorkers(s){const p=ensureProduction(s);return Math.min(WORKER_MAX,workerNumber(s.workers)+(p.lumberWorker?1:0)+(p.mineWorker?1:0));}
function toast(m){const e=document.querySelector('#toast');if(!e)return;e.textContent=m;e.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.remove('show'),1900);}
function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}

function setupBuildButton(){
  if(document.querySelector('#productionBuildButton'))return;
  const b=document.createElement('button');b.id='productionBuildButton';b.type='button';b.style.cssText='position:absolute;left:50%;bottom:205px;transform:translateX(-50%);z-index:9;border:0;border-radius:14px;padding:10px 14px;background:rgba(255,255,255,.95);box-shadow:0 4px 14px rgba(31,69,57,.22);font-weight:900;color:#25423a;display:none;touch-action:manipulation;';
  b.addEventListener('pointerdown',e=>{e.preventDefault();if(b.dataset.kind==='lumber')build('lumber');else if(b.dataset.kind==='mine')build('mine');},{passive:false});
  document.querySelector('#app')?.appendChild(b);
}
function updateBuildButton(){
  const b=document.querySelector('#productionBuildButton');if(!b||!currentGame)return;
  const p=ensureProduction(currentGame.state),pl=currentGame.player;
  let kind='';if(!p.lumberBuilt&&dist(pl,LUMBER)<=LUMBER.radius)kind='lumber';else if(!p.mineBuilt&&dist(pl,MINE)<=MINE.radius)kind='mine';
  const display=kind?'block':'none';if(b.style.display!==display)b.style.display=display;
  if(!kind){b.dataset.kind='';return;}b.dataset.kind=kind;
  const text=kind==='lumber'?'🪓 벌목장 건설 · 나무3 돌1':'⛏️ 광산 건설 · 나무2 돌3';if(b.textContent!==text)b.textContent=text;
}
function build(kind){
  if(!currentGame)return;const s=currentGame.state,p=ensureProduction(s),c=kind==='lumber'?LUMBER:MINE,built=kind==='lumber'?'lumberBuilt':'mineBuilt';if(p[built])return;
  if((Number(s.inventory.wood)||0)<c.wood||(Number(s.inventory.stone)||0)<c.stone)return toast(kind==='lumber'?'벌목장 재료 부족 · 나무3 돌1':'광산 재료 부족 · 나무2 돌3');
  s.inventory.wood-=c.wood;s.inventory.stone-=c.stone;p[built]=true;save();updateBuildButton();toast(kind==='lumber'?'🪓 벌목장 완성 · 더블탭하면 노비 배치':'⛏️ 광산 완성 · 더블탭하면 노비 배치');
}
function assignWorker(kind){
  if(!currentGame)return;const s=currentGame.state,p=ensureProduction(s),wk=kind==='lumber'?'lumberWorker':'mineWorker',bk=kind==='lumber'?'lumberBuilt':'mineBuilt';if(!p[bk])return;
  if(p[wk])return toast(kind==='lumber'?'🧑‍🌾 벌목장에서 이미 작업 중이야':'🧑‍🌾 광산에서 이미 작업 중이야');
  if(workerNumber(s.workers)<=0)return toast('농사 중인 노비가 없어 · 근처에 서 있으면 직접 생산해');
  s.workers=workerNumber(s.workers)-1;p[wk]=1;p[kind==='lumber'?'lumberTimer':'mineTimer']=0;save();toast(kind==='lumber'?'🪓 노비 1명을 벌목장에 배치했어':'⛏️ 노비 1명을 광산에 배치했어');
}
function returnWorker(){if(!currentGame)return;const s=currentGame.state,p=ensureProduction(s);let from='';if(p.lumberWorker){p.lumberWorker=0;from='벌목장';}else if(p.mineWorker){p.mineWorker=0;from='광산';}if(!from)return toast('모든 노비가 이미 농사일 중이야');s.workers=Math.min(WORKER_MAX,workerNumber(s.workers)+1);save();toast(`🧑‍🌾 ${from} 노비가 농사일로 돌아왔어`);}
function screenToWorld(sx,sy){if(!currentGame)return null;return{x:sx+currentGame.player.x-innerWidth/2,y:sy+currentGame.player.y-innerHeight/2};}
function doubleAt(sx,sy){if(!currentGame)return;const now=performance.now();if(now-lastHandledAt<260)return;const q=screenToWorld(sx,sy),p=ensureProduction(currentGame.state);if(!q)return;
  if(p.lumberBuilt&&Math.hypot(q.x-LUMBER.x,q.y-LUMBER.y)<=65){lastHandledAt=now;assignWorker('lumber');return;}
  if(p.mineBuilt&&Math.hypot(q.x-MINE.x,q.y-MINE.y)<=65){lastHandledAt=now;assignWorker('mine');return;}
  if(q.x>=FARM.x1&&q.x<=FARM.x2&&q.y>=FARM.y1&&q.y<=FARM.y2){lastHandledAt=now;returnWorker();}
}
const canvas=document.querySelector('#game');canvas?.addEventListener('dblclick',e=>doubleAt(e.clientX,e.clientY));canvas?.addEventListener('pointerup',e=>{const n=performance.now();if(n-lastTap.time<360&&Math.hypot(e.clientX-lastTap.x,e.clientY-lastTap.y)<38)doubleAt(e.clientX,e.clientY);lastTap={time:n,x:e.clientX,y:e.clientY};});

function feedAssigned(s,p){let dead=0;for(const k of ['lumberWorker','mineWorker']){if(!p[k])continue;if((Number(s.inventory.food)||0)>=FEED_COST)s.inventory.food-=FEED_COST;else{p[k]=0;dead++;}}save();if(dead)toast(`⚠️ 식량 부족으로 작업장 노비 ${dead}명이 굶어 죽었어`);}
function simulate(dt){
  if(!currentGame||document.hidden||activeRuntime?.paused)return;const s=currentGame.state,p=ensureProduction(s);if(!s.inventory)return;
  s.workerWorkTimer=0;if(s.workerStorage){s.workerStorage.wood=0;s.workerStorage.stone=0;}
  reconcileWorkers(s);let changed=false;
  if(p.lumberBuilt){if(p.lumberWorker){p.lumberTimer+=dt;while(p.lumberTimer>=PRODUCE_SECONDS){p.lumberTimer-=PRODUCE_SECONDS;p.bufferWood++;changed=true;}p.playerLumberTimer=0;}else if(dist(currentGame.player,LUMBER)<=92){p.playerLumberTimer+=dt;while(p.playerLumberTimer>=PRODUCE_SECONDS){p.playerLumberTimer-=PRODUCE_SECONDS;s.inventory.wood=(Number(s.inventory.wood)||0)+1;changed=true;toast('🪵 벌목장에서 직접 작업 · 나무 +1');}}else p.playerLumberTimer=0;}
  if(p.mineBuilt){if(p.mineWorker){p.mineTimer+=dt;while(p.mineTimer>=PRODUCE_SECONDS){p.mineTimer-=PRODUCE_SECONDS;p.bufferStone++;changed=true;}p.playerMineTimer=0;}else if(dist(currentGame.player,MINE)<=92){p.playerMineTimer+=dt;while(p.playerMineTimer>=PRODUCE_SECONDS){p.playerMineTimer-=PRODUCE_SECONDS;s.inventory.stone=(Number(s.inventory.stone)||0)+1;changed=true;toast('🪨 광산에서 직접 작업 · 돌 +1');}}else p.playerMineTimer=0;}
  const assigned=(p.lumberWorker?1:0)+(p.mineWorker?1:0);if(assigned){p.deliveryTimer+=dt;p.assignedFeedTimer+=dt;if(p.deliveryTimer>=DELIVERY_SECONDS){p.deliveryTimer%=DELIVERY_SECONDS;const w=p.bufferWood,st=p.bufferStone;s.inventory.wood=(Number(s.inventory.wood)||0)+w;s.inventory.stone=(Number(s.inventory.stone)||0)+st;p.bufferWood=0;p.bufferStone=0;if(w+st)toast(`🧺 작업장 지급 · 나무 ${w} · 돌 ${st}`);changed=true;}if(p.assignedFeedTimer>=FEED_SECONDS){p.assignedFeedTimer%=FEED_SECONDS;feedAssigned(s,p);return;}}else{p.deliveryTimer=0;p.assignedFeedTimer=0;}
  if(changed)save();
}
function patchPanels(){if(!currentGame)return;const body=document.querySelector('#panelBody'),title=document.querySelector('#panelTitle')?.textContent||'';if(!body)return;const s=currentGame.state,p=ensureProduction(s),total=totalWorkers(s);
  if(title==='가방'){for(const note of body.querySelectorAll('.panel-note'))if(note.textContent.includes('노비')){const next=note.textContent.replace(/노비\s+\d+\/3(?:\s*\([^)]*\))?/,`노비 ${total}/3 (농사 ${workerNumber(s.workers)} · 벌목 ${p.lumberWorker} · 광산 ${p.mineWorker})`);if(note.textContent!==next)note.textContent=next;}}
  if(title==='노비 판매소'){const buy=body.querySelector('[data-worker]');if(buy){const dis=total>=WORKER_MAX;if(buy.disabled!==dis)buy.disabled=dis;const span=buy.querySelector('span'),t=`🧑‍🌾 노비 구매 (${total}/${WORKER_MAX})`;if(span&&span.textContent!==t)span.textContent=t;}for(const card of body.querySelectorAll('.item-card'))if(card.textContent.includes('노비')){const span=card.querySelector('span'),t=`${total}명`;if(span&&span.textContent!==t)span.textContent=t;}const n=body.querySelector('.panel-note');const nt='농사 노비는 물주기·수확을 해. 벌목장/광산 노비는 5초마다 자원을 모아.';if(n&&n.textContent!==nt)n.textContent=nt;let st=body.querySelector('[data-job-status]');if(!st){st=document.createElement('p');st.className='panel-note';st.dataset.jobStatus='1';body.appendChild(st);}const tx=`작업 배치 · 농사 ${workerNumber(s.workers)}명 · 벌목 ${p.lumberWorker}명 · 광산 ${p.mineWorker}명 · 보관 나무 ${p.bufferWood} / 돌 ${p.bufferStone}`;if(st.textContent!==tx)st.textContent=tx;}
}
document.addEventListener('click',e=>{const b=e.target.closest?.('[data-worker]');if(!b||!currentGame||totalWorkers(currentGame.state)<WORKER_MAX)return;e.preventDefault();e.stopImmediatePropagation();toast('노비는 최대 3명이야');},true);

const rp=IslandRendererV3.prototype, originalDraw=rp.draw, originalDrawObjects=rp.drawObjects;
rp.draw=function(game){currentGame=game;reconcileWorkers(game.state);originalDraw.call(this,game);};
rp.drawObjects=function(ctx,game){originalDrawObjects.call(this,ctx,game);const p=ensureProduction(game.state);drawLumber(ctx,p);drawMine(ctx,p);};
function drawLumber(ctx,p){ctx.save();ctx.textAlign='center';if(!p.lumberBuilt){ctx.setLineDash([7,6]);ctx.strokeStyle='#6d725d';ctx.lineWidth=3;ctx.strokeRect(LUMBER.x-55,LUMBER.y-38,110,76);ctx.setLineDash([]);ctx.font='28px system-ui';ctx.fillText('🪓',LUMBER.x,LUMBER.y+8);ctx.fillStyle='#315748';ctx.font='700 11px system-ui';ctx.fillText('벌목장 건설터 · 나무3 돌1',LUMBER.x,LUMBER.y+58);}else{ctx.fillStyle='#a97849';ctx.fillRect(LUMBER.x-55,LUMBER.y-32,110,70);ctx.fillStyle='#6f5034';ctx.beginPath();ctx.moveTo(LUMBER.x-66,LUMBER.y-32);ctx.lineTo(LUMBER.x,LUMBER.y-70);ctx.lineTo(LUMBER.x+66,LUMBER.y-32);ctx.closePath();ctx.fill();ctx.font='28px system-ui';ctx.fillText('🪵',LUMBER.x,LUMBER.y+12);if(p.lumberWorker)ctx.fillText('🧑‍🌾',LUMBER.x+48,LUMBER.y+20);ctx.fillStyle='#315748';ctx.font='700 11px system-ui';ctx.fillText(p.lumberWorker?'벌목장 · 노비 작업중 · 5초 +1':'벌목장 · 더블탭 노비 배치',LUMBER.x,LUMBER.y+58);}ctx.restore();}
function drawMine(ctx,p){ctx.save();ctx.textAlign='center';if(!p.mineBuilt){ctx.setLineDash([7,6]);ctx.strokeStyle='#6d725d';ctx.lineWidth=3;ctx.strokeRect(MINE.x-55,MINE.y-38,110,76);ctx.setLineDash([]);ctx.font='28px system-ui';ctx.fillText('⛏️',MINE.x,MINE.y+8);ctx.fillStyle='#315748';ctx.font='700 11px system-ui';ctx.fillText('광산 건설터 · 나무2 돌3',MINE.x,MINE.y+58);}else{ctx.fillStyle='#77756f';ctx.beginPath();ctx.ellipse(MINE.x,MINE.y+3,65,43,0,Math.PI,Math.PI*2);ctx.lineTo(MINE.x+65,MINE.y+35);ctx.lineTo(MINE.x-65,MINE.y+35);ctx.closePath();ctx.fill();ctx.fillStyle='#3e403e';ctx.beginPath();ctx.arc(MINE.x,MINE.y+12,28,Math.PI,Math.PI*2);ctx.fill();ctx.font='27px system-ui';ctx.fillText('⛏️',MINE.x,MINE.y+9);if(p.mineWorker)ctx.fillText('🧑‍🌾',MINE.x+53,MINE.y+20);ctx.fillStyle='#315748';ctx.font='700 11px system-ui';ctx.fillText(p.mineWorker?'광산 · 노비 작업중 · 5초 +1':'광산 · 더블탭 노비 배치',MINE.x,MINE.y+58);}ctx.restore();}

setupBuildButton();
setInterval(()=>{const now=performance.now(),dt=Math.min(1,Math.max(0,(now-lastTick)/1000));lastTick=now;simulate(dt);if(now-lastUi>250){lastUi=now;updateBuildButton();patchPanels();}},100);
