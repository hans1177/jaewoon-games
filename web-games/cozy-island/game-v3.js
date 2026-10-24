import { JaewoonVibeRuntime } from '../../assets/vibe-runtime.js';
import { IslandRendererV3 } from './render-v3.js';

const GAME_ID='cozy-island';
const RAID_INTERVAL=120;
const FARM_GROW_MS=20000;
const WORKER_PRICE=50, WORKER_MAX=3, WORK_TICK=10, DELIVERY_INTERVAL=60, FEED_INTERVAL=180, FEED_COST=10;
const SOLDIER_MAX=5, ARCHER_MAX=3;
const DEFAULT_STATE={
  version:3,day:1,minutes:480,coins:40,weather:'맑음',expanded:false,decor:[],barracksBuilt:false,army:[],raidTimer:0,raidNumber:0,
  inventory:{wood:0,stone:0,flower:0,fish:0,crop:0,seeds:3,food:0},
  plots:Array.from({length:6},()=>({state:'empty',watered:false,wateredAt:0,ready:false})),
  player:{x:730,y:640},playMinutes:0,
  workers:0,workerStorage:{wood:0,stone:0,food:0,crop:0},workerWorkTimer:0,workerDeliveryTimer:0,workerFeedTimer:0
};
const world={w:3100,h:1200};
const runtime=new JaewoonVibeRuntime({gameId:GAME_ID,autosaveDelay:350}).boot({errorReporter:e=>console.error('[포근섬 오류]',e)});
const state=normalizeState(runtime.loadProgress(DEFAULT_STATE));
const canvas=document.querySelector('#game');
const renderer=new IslandRendererV3(canvas);
const player={x:state.player.x,y:state.player.y,speed:185};
const pressed=new Set();
let lastFrame=performance.now(),clockCarry=0,toastTimer=0,fishing=null,fishingFrame=0,unitId=1,raidActive=false;
// 기존 저장 좌표는 호환을 위해 유지하며 전략 시점에는 캐릭터 이동을 사용하지 않는다.
let allies=[],enemies=[],selectedWolfId=null,lastTap={time:0,x:0,y:0};
// 메인: 기존 일반 습격은 그대로 두고 성채 건설 이후 선택형 대공성전만 추가한다.
let grandSiege=null,raidWarningShown=false;
const SIEGE_INTERVALS=[60,120,180,300,600],SIEGE_WAVE_SIZES=[18,24,30,34,38,42];
const SIEGE_MACHINES=new Set(['ram','siegeTower','trebuchet','sapper']);
const getFort=()=>state.villageDevelopment?.fortification;
const raidInterval=()=>SIEGE_INTERVALS.includes(getFort()?.raidIntervalSec)?getFort().raidIntervalSec:RAID_INTERVAL;
const barracks={x:1080,y:650},workerShop={x:1200,y:820};
const wolves=[
  makeWolf(1,1650,360),makeWolf(2,2050,760),makeWolf(3,2450,420),makeWolf(4,2720,840)
];
const nodes=[
  ...[[260,220],[330,760],[515,835],[590,205],[1120,220],[1225,720],[300,940],[1040,790],[1500,250],[1720,850],[1980,300],[2240,760],[2500,220],[2740,650]].map((p,i)=>({id:`tree${i}`,kind:'tree',x:p[0],y:p[1],readyAt:0,lockedByExpansion:i>7})),
  ...[[460,650],[570,700],[855,675],[1185,650],[420,930],[1280,300],[1600,620],[2100,520],[2600,520]].map((p,i)=>({id:`flower${i}`,kind:'flower',x:p[0],y:p[1],readyAt:0,icon:i%2?'🌷':'🌼',lockedByExpansion:i>5})),
  ...[[250,555],[600,920],[1180,820],[1260,190],[1500,480],[1850,900],[2300,300],[2680,920]].map((p,i)=>({id:`rock${i}`,kind:'rock',x:p[0],y:p[1],readyAt:0,lockedByExpansion:i>3}))
];
const npcs=[
  {id:'sky',name:'하늘',icon:'🧑‍🦰',x:610,y:555,line:'씨앗이 모자라면 나한테 와.'},
  {id:'momo',name:'모모',icon:'👩‍🦱',x:805,y:600,line:'연못에는 물고기가 있어.'},
  {id:'danbi',name:'단비',icon:'🧒',x:960,y:700,line:'농작물은 물을 준 뒤 20초면 자라.'}
];
const game={world,state,player,nodes,npcs,barracks,workerShop,allies,enemies,wolves,weather:state.weather,timeNow:Date.now(),raidActive,selectedWolfId,siegeOverview:true};
const ui={
  help:qs('#helpCommand'),day:qs('#dayText'),time:qs('#timeText'),weather:qs('#weatherText'),coins:qs('#coinText'),raid:qs('#raidText'),hint:qs('#hint'),toast:qs('#toast'),inventory:qs('#inventoryButton'),castle:qs('#castleCommand'),barracks:qs('#barracksCommand'),workers:qs('#workersCommand'),fishingCommand:qs('#fishingCommand'),trade:qs('#tradeCommand'),center:qs('#centerCommand'),zoomIn:qs('#zoomIn'),zoomOut:qs('#zoomOut'),panel:qs('#panel'),panelTitle:qs('#panelTitle'),panelBody:qs('#panelBody'),panelClose:qs('#panelClose'),fishing:qs('#fishing'),fishMarker:qs('#fishMarker'),catch:qs('#catchButton'),cancelFishing:qs('#cancelFishing')
};
function qs(s){return document.querySelector(s)}
function normalizeState(raw){
  const base=structuredClone(DEFAULT_STATE), r=raw||{};
  const oldWorkers=typeof r.workers==='object'&&r.workers?Math.floor(Number(r.workers.count)||0):Math.floor(Number(r.workers)||0);
  const oldBuf=typeof r.workers==='object'&&r.workers?.buffer?r.workers.buffer:r.workerStorage||{};
  const inv={...base.inventory,...(r.inventory||{})};
  const plots=Array.isArray(r.plots)&&r.plots.length===6?r.plots.map(p=>({state:'empty',watered:false,wateredAt:0,ready:false,...p})):base.plots;
  return {...base,...r,version:3,inventory:inv,plots,
    army:Array.isArray(r.army)?r.army.filter(x=>x?.kind==='soldier'||x?.kind==='archer').slice(0,SOLDIER_MAX+ARCHER_MAX):[],
    workers:Math.min(WORKER_MAX,Math.max(0,oldWorkers)),
    workerStorage:{wood:Math.max(0,Number(oldBuf.wood)||0),stone:Math.max(0,Number(oldBuf.stone)||0),food:Math.max(0,Number(oldBuf.food)||0),crop:Math.max(0,Number(oldBuf.crop)||0)},
    workerWorkTimer:Math.max(0,Number(r.workerWorkTimer)||Number(r.workers?.workElapsed)||0),
    workerDeliveryTimer:Math.max(0,Number(r.workerDeliveryTimer)||Number(r.workers?.deliveryElapsed)||0),
    workerFeedTimer:Math.max(0,Number(r.workerFeedTimer)||0),
    raidTimer:Math.max(0,Math.min(RAID_INTERVAL,Number(r.raidTimer)||0)),
    player:{...base.player,...(r.player||{})},decor:Array.isArray(r.decor)?r.decor.slice(0,3):[]};
}
function saveSoon(){state.army=allies.filter(u=>u.hp>0).map(u=>({kind:u.kind}));state.player={x:Math.round(player.x),y:Math.round(player.y)};runtime.queueSaveProgress(state)}
function toast(msg){clearTimeout(toastTimer);ui.toast.textContent=msg;ui.toast.classList.add('show');toastTimer=setTimeout(()=>ui.toast.classList.remove('show'),1900)}
function itemCard(n,c){return `<div class="item-card">${n}<span>${Math.floor(Number(c)||0)}개</span></div>`}
function dist(x,y){return Math.hypot(player.x-x,player.y-y)}

runtime.bindKeyboard({
  KeyW:{down:()=>pressed.add('up'),up:()=>pressed.delete('up')},ArrowUp:{down:()=>pressed.add('up'),up:()=>pressed.delete('up')},
  KeyS:{down:()=>pressed.add('down'),up:()=>pressed.delete('down')},ArrowDown:{down:()=>pressed.add('down'),up:()=>pressed.delete('down')},
  KeyA:{down:()=>pressed.add('left'),up:()=>pressed.delete('left')},ArrowLeft:{down:()=>pressed.add('left'),up:()=>pressed.delete('left')},
  KeyD:{down:()=>pressed.add('right'),up:()=>pressed.delete('right')},ArrowRight:{down:()=>pressed.add('right'),up:()=>pressed.delete('right')},
  Space:{down:e=>{e.preventDefault();interact()}}
});
runtime.bindTouchButton(ui.inventory,openInventory);
runtime.bindTouchButton(ui.help,openGuide);
runtime.bindTouchButton(ui.castle,()=>document.querySelector('#castleManageButton')?.click());
runtime.bindTouchButton(ui.barracks,openBarracks);
runtime.bindTouchButton(ui.workers,openWorkerShop);
runtime.bindTouchButton(ui.fishingCommand,startFishing);
runtime.bindTouchButton(ui.trade,()=>window.dispatchEvent(new Event('cozy:open-trade')));
runtime.bindTouchButton(ui.center,()=>{game.siegeOverview=true;renderer.centerCamera();toast('🏰 성채 전장 전체 보기')});
runtime.bindTouchButton(ui.zoomIn,()=>{game.siegeOverview=true;renderer.changeZoom(1.2)});
runtime.bindTouchButton(ui.zoomOut,()=>{game.siegeOverview=true;renderer.changeZoom(1/1.2)});
runtime.bindTouchButton(ui.panelClose,()=>ui.panel.close());
runtime.bindTouchButton(ui.catch,catchFish);
runtime.bindTouchButton(ui.cancelFishing,stopFishing);
window.addEventListener('resize',()=>renderer.resize());
window.addEventListener('jaewoon:pause',e=>{if(e.detail.paused)pressed.clear()});
let pointerGesture=null;
canvas.addEventListener('pointerdown',e=>{
  if(e.pointerType==='mouse'&&e.button!==0)return;
  pointerGesture={id:e.pointerId,x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,moved:false};
  canvas.setPointerCapture?.(e.pointerId);
});
canvas.addEventListener('pointermove',e=>{
  if(!pointerGesture||pointerGesture.id!==e.pointerId)return;
  const g=pointerGesture,dx=e.clientX-g.x,dy=e.clientY-g.y;
  if(g.moved||Math.hypot(e.clientX-g.startX,e.clientY-g.startY)>9){
    g.moved=true;game.siegeOverview=true;renderer.panCamera(dx,dy);
  }
  g.x=e.clientX;g.y=e.clientY;
});
canvas.addEventListener('pointercancel',()=>{pointerGesture=null});
canvas.addEventListener('pointerup',e=>{
  if(!pointerGesture||pointerGesture.id!==e.pointerId)return;
  const g=pointerGesture;pointerGesture=null;
  if(g.moved||ui.panel.open||ui.fishing.open||runtime.paused)return;
  const now=performance.now();
  if(now-lastTap.time<360&&Math.hypot(e.clientX-lastTap.x,e.clientY-lastTap.y)<38)commandWolfAt(e.clientX,e.clientY);
  lastTap={time:now,x:e.clientX,y:e.clientY};
  // 기존 지역 확장 스크립트의 상호작용 이벤트를 월드 터치에 연결.
  const legacyAction=document.querySelector('#actionButton');
  if(legacyAction&&!legacyAction.dispatchEvent(new PointerEvent('pointerdown',{
    bubbles:true,cancelable:true,pointerType:e.pointerType||'touch'
  })))return;
  const pos=renderer.screenToWorld(game,e.clientX,e.clientY);
  const radius=Math.max(78,Math.min(146,44/(renderer.camera3?.zoom||.5)));
  const target=nearestInteraction(pos,radius);
  if(target){activateInteraction(target);return}
  // 빈 땅 터치는 선택을 해제한다. 전략 카메라는 드래그로만 이동한다.
});
canvas.addEventListener('wheel',e=>{e.preventDefault();game.siegeOverview=true;renderer.changeZoom(e.deltaY<0?1.16:1/1.16)},{passive:false});

// 도움말: 건설/생산/군사 명령을 기존 조작 패널로 연결한다.
function openGuide(){
  if(ui.panel.open||ui.fishing.open)return;
  const village=state.villageDevelopment||{},production=state.productionBuildings||{};
  ui.panelTitle.textContent='영지 운영 안내';
  ui.panelBody.innerHTML=`<p class="panel-note">지도 드래그로 이동 · 두 손가락 또는 ＋/－로 확대·축소 · 건물과 자원을 눌러 관리해. 플레이어 캐릭터는 없어.</p>
    <div class="inventory-grid">
      <div class="item-card">성채 건설<span>${village.townHallBuilt?'완료':'건설 필요'}</span></div>
      <div class="item-card">병영<span>${state.barracksBuilt?'완료':'건설 필요'}</span></div>
      <div class="item-card">벌목장<span>${production.lumberBuilt?'가동 가능':'미건설'}</span></div>
      <div class="item-card">광산<span>${production.mineBuilt?'가동 가능':'미건설'}</span></div>
    </div>
    <p class="panel-note">① 지도에서 나무·돌을 채집하거나 자원 생산시설을 건설해. ② 병영을 지어 부대를 모집하고 병력을 강화해. ③ 성채에서 방어시설과 수비 명령을 정해. ④ 준비되면 대공성전을 시작해.</p>
    <div class="choice-grid"><button class="choice" data-guide="castle">🏰 성채·건물 건설</button><button class="choice" data-guide="barracks">⚔️ 병영·병력 강화</button><button class="choice" data-guide="workers">👷 주민·생산 관리</button></div>`;
  ui.panel.showModal();
  ui.panelBody.querySelectorAll('[data-guide]').forEach(button=>button.addEventListener('click',()=>{
    const target=button.dataset.guide;ui.panel.close();
    if(target==='castle')ui.castle.click();
    else if(target==='barracks')ui.barracks.click();
    else ui.workers.click();
  }));
}
function openInventory(){if(ui.fishing.open)return;ui.panelTitle.textContent='가방';const i=state.inventory;ui.panelBody.innerHTML=`<div class="inventory-grid">${itemCard('🪵 나무',i.wood)}${itemCard('🪨 돌',i.stone)}${itemCard('🍖 식량',i.food)}${itemCard('🌼 꽃',i.flower)}${itemCard('🐟 물고기',i.fish)}${itemCard('🥕 농작물',i.crop)}${itemCard('🌱 씨앗',i.seeds)}</div><p class="panel-note">노비 ${state.workers}/${WORKER_MAX} · 병사 ${countKind('soldier')}/${SOLDIER_MAX} · 궁수 ${countKind('archer')}/${ARCHER_MAX}</p><p class="panel-note">중세 아트: SketchyLogic · Yar · Seth Galbraith · rubberduck · feudalwars. <a href="../../assets/shared/medieval/license.txt" target="_blank" rel="noopener">출처·라이선스</a></p>`;ui.panel.showModal()}
function countKind(kind){return allies.filter(u=>u.kind===kind&&u.hp>0).length}

function nearestInteraction(at=player,radius=86){const dist=(x,y)=>Math.hypot(at.x-x,at.y-y);const c=[];for(const n of nodes){if(n.lockedByExpansion&&!state.expanded)continue;c.push({type:'node',item:n,d:dist(n.x,n.y)})}npcs.forEach(n=>c.push({type:'npc',item:n,d:dist(n.x,n.y)}));state.plots.forEach((p,i)=>{const x=959+(i%3)*78,y=404+Math.floor(i/3)*78;c.push({type:'plot',item:{plot:p,index:i},d:dist(x,y)})});c.push({type:'house',d:dist(765,350)},{type:'ship',d:dist(775,760)},{type:'fish',d:dist(520,430)},{type:'barracks',d:dist(barracks.x,barracks.y)},{type:'workerShop',d:dist(workerShop.x,workerShop.y)});if(!state.expanded)c.push({type:'expand',d:dist(1325,600)});c.sort((a,b)=>a.d-b.d);return c[0]?.d<=radius?c[0]:null}
function interactionHint(t){
  if(!t)return raidActive?'⚔️ 습격 중 · 병사들이 성채를 방어 중':'지도를 드래그하고 건물을 터치해 관리';
  if(t.type==='node')return '근처 자원 자동 채집 중';
  if(t.type==='npc')return t.item.name+' · 터치해서 대화';
  if(t.type==='house')return '집 터치 · 꾸미기';
  if(t.type==='ship')return '무역 · 상선 매매와 생산품 출하';
  if(t.type==='barracks')return '병영 · 병력 관리';
  if(t.type==='workerShop')return '일꾼 작업장 · 관리';
  if(t.type==='fish')return '연못 터치 · 낚시';
  if(t.type==='expand')return '동쪽 지역 해금 · 120골드';
  if(t.type==='plot')return t.item.plot.ready?'밭 터치 · 수확':t.item.plot.state==='empty'?'밭 터치 · 씨앗 심기':!t.item.plot.watered?'밭 터치 · 물 주기':'밭 · 재배 중';
  return '터치해서 관리';
}
function interact(){
  if(runtime.paused||ui.panel.open||ui.fishing.open)return;
  const target=nearestInteraction();
  if(target)activateInteraction(target);else toast('지도에서 자원 또는 건물을 선택해');
}
function activateInteraction(t){
  if(runtime.paused||ui.panel.open||ui.fishing.open)return;
  if(t.type==='node'){
    // 전략게임: 화면에서 선택한 자원을 직접 채집하며 캐릭터 근접 판정을 요구하지 않는다.
    if(t.item.readyAt<=Date.now())collectNode(t.item);
  }else if(t.type==='npc')talkTo(t.item);
  else if(t.type==='house')openDecor();
  else if(t.type==='ship')ui.trade?.click();
  else if(t.type==='barracks')openBarracks();
  else if(t.type==='workerShop')openWorkerShop();
  else if(t.type==='fish')startFishing();
  else if(t.type==='expand')expandIsland();
  else if(t.type==='plot')usePlot(t.item.index,t.item.plot.state==='empty'?'seed':'water');
}
function collectNode(n){const now=Date.now();if(n.readyAt>now){toast('조금 뒤에 다시 생겨');return}if(n.kind==='tree'){state.inventory.wood++;toast('🪵 나무 +1')}else if(n.kind==='rock'){state.inventory.stone++;toast('🪨 돌 +1')}else{state.inventory.flower++;toast('🌼 꽃 +1')}n.readyAt=now+30000;saveSoon()}
function talkTo(n){ui.panelTitle.textContent=n.name;const extra=n.id==='sky'?`<button class="choice" data-seed><span>🌱 씨앗 3개</span><b>15골드</b></button>`:'';ui.panelBody.innerHTML=`<p class="panel-note">${n.line}</p><div class="choice-grid">${extra}</div>`;ui.panel.showModal();ui.panelBody.querySelector('[data-seed]')?.addEventListener('click',()=>{if(state.coins<15){toast('골드가 부족해');return}state.coins-=15;state.inventory.seeds+=3;saveSoon();updateHUD();toast('🌱 씨앗 +3')})}
function openBarracks(){ui.panelTitle.textContent=state.barracksBuilt?'병영':'병영 건설';renderBarracks();ui.panel.showModal()}
function renderBarracks(){if(!state.barracksBuilt){ui.panelBody.innerHTML=`<p class="panel-note">병영을 지으면 병사와 궁수를 모집할 수 있어.</p><button class="choice" data-build><span>🏕️ 병영 건설</span><b>나무5 · 돌3</b></button>`;ui.panelBody.querySelector('[data-build]')?.addEventListener('click',buildBarracks);return}const s=countKind('soldier'),a=countKind('archer');ui.panelBody.innerHTML=`<div class="inventory-grid">${itemCard('⚔️ 병사',s)}${itemCard('🏹 궁수',a)}${itemCard('🍖 식량',state.inventory.food)}</div><div class="choice-grid" style="margin-top:10px"><button class="choice" data-rec="soldier" ${s>=SOLDIER_MAX?'disabled':''}><span>⚔️ 병사 모집 (${s}/${SOLDIER_MAX})</span><b>식량10</b></button><button class="choice" data-rec="archer" ${a>=ARCHER_MAX?'disabled':''}><span>🏹 궁수 모집 (${a}/${ARCHER_MAX})</span><b>식량20</b></button></div><p class="panel-note">궁수는 공격력 2.5배, 체력은 낮아.</p>`;ui.panelBody.querySelectorAll('[data-rec]').forEach(b=>b.addEventListener('click',()=>recruit(b.dataset.rec)))}
function buildBarracks(){if(state.inventory.wood<5||state.inventory.stone<3){toast('재료가 부족해');return}state.inventory.wood-=5;state.inventory.stone-=3;state.barracksBuilt=true;saveSoon();ui.panel.close();toast('🏕️ 병영 완성')}
function recruit(kind){const max=kind==='archer'?ARCHER_MAX:SOLDIER_MAX,cost=kind==='archer'?20:10;if(countKind(kind)>=max){toast('최대 인원이야');return}if(state.inventory.food<cost){toast(`식량 ${cost} 필요`);return}state.inventory.food-=cost;allies.push(createUnit(kind,false));game.allies=allies;saveSoon();renderBarracks();toast(kind==='archer'?'🏹 궁수 합류':'⚔️ 병사 합류')}
function createUnit(kind,enemy,boss=false){const ar=kind==='archer',baseHp=ar?55:100,baseAtk=ar?25:10,hp=boss?baseHp*7:baseHp;return{id:unitId++,kind,enemy,boss,hp,maxHp:hp,attack:boss?baseAtk*3:baseAtk,range:ar?220:55,speed:ar?64:76,cool:Math.random()*.5,wander:0,vx:0,vy:0,x:enemy?1490+Math.random()*60:barracks.x+(Math.random()-.5)*70,y:enemy?550+Math.random()*180:barracks.y+60+Math.random()*60}}
function openWorkerShop(){ui.panelTitle.textContent='노비 판매소';renderWorkerShop();ui.panel.showModal()}
function renderWorkerShop(){const s=state.workerStorage,delivery=Math.max(0,Math.ceil(DELIVERY_INTERVAL-state.workerDeliveryTimer)),feed=Math.max(0,Math.ceil(FEED_INTERVAL-state.workerFeedTimer));ui.panelBody.innerHTML=`<p class="panel-note">노비는 자동 물주기·수확·나무/돌 채집을 해. 1분마다 작업물을 인벤토리로 줘.</p><div class="inventory-grid">${itemCard('🧑‍🌾 노비',state.workers)}${itemCard('⏱️ 지급',delivery)}${itemCard('🍖 급식까지',feed)}${itemCard('🪵 보관',s.wood)}${itemCard('🪨 보관',s.stone)}${itemCard('🍖 보관',s.food)}${itemCard('🥕 보관',s.crop)}</div><button class="choice" data-worker ${state.workers>=WORKER_MAX?'disabled':''}><span>🧑‍🌾 노비 구매 (${state.workers}/${WORKER_MAX})</span><b>${WORKER_PRICE}골드</b></button><p class="panel-note">3분마다 노비 1명당 식량 10을 먹어. 먹일 식량이 부족한 노비는 굶어 죽어.</p>`;ui.panelBody.querySelector('[data-worker]')?.addEventListener('click',buyWorker)}
function buyWorker(){if(state.workers>=WORKER_MAX){toast('노비는 최대 3명이야');return}if(state.coins<WORKER_PRICE){toast('골드가 부족해');return}state.coins-=WORKER_PRICE;state.workers++;saveSoon();updateHUD();renderWorkerShop();toast('🧑‍🌾 노비가 일을 시작했어')}
function openDecor(){const opts=[{id:'rug',n:'포근 러그',i:'🟩',c:30},{id:'plant',n:'화분',i:'🪴',c:45},{id:'lamp',n:'조명',i:'🏮',c:60}];ui.panelTitle.textContent='우리 집 꾸미기';ui.panelBody.innerHTML=`<div class="choice-grid">${opts.map(o=>`<button class="choice" data-dec="${o.id}" ${state.decor.includes(o.id)?'disabled':''}><span>${o.i} ${o.n}</span><b>${state.decor.includes(o.id)?'배치됨':o.c+'골드'}</b></button>`).join('')}</div>`;ui.panel.showModal();ui.panelBody.querySelectorAll('[data-dec]').forEach(b=>b.addEventListener('click',()=>{const o=opts.find(x=>x.id===b.dataset.dec);if(!o||state.coins<o.c)return toast('골드가 부족해');state.coins-=o.c;state.decor.push(o.id);saveSoon();updateHUD();ui.panel.close();toast('꾸미기 완료')}))}
function usePlot(index,tool){const p=state.plots[index];if(p.ready){p.state='empty';p.watered=false;p.wateredAt=0;p.ready=false;state.inventory.crop++;state.inventory.food+=10;saveSoon();toast('🥕 농작물 +1 · 🍖 식량 +10');return}if(p.state==='empty'){if(tool!=='seed')return toast('씨앗을 선택해');if(state.inventory.seeds<=0)return toast('씨앗이 없어');state.inventory.seeds--;p.state='growing';p.watered=false;p.wateredAt=0;p.ready=false;saveSoon();toast('🌱 씨앗을 심었어');return}if(!p.watered){if(tool!=='water')return toast('물뿌리개를 선택해');p.watered=true;p.wateredAt=Date.now();saveSoon();toast('💧 물을 줬어 · 20초');return}toast('🌱 자라는 중')}
function updateCrops(){const now=Date.now();for(const p of state.plots)if(p.state==='growing'&&p.watered&&!p.ready&&p.wateredAt&&now-p.wateredAt>=FARM_GROW_MS)p.ready=true}
function expandIsland(){if(state.coins<120){toast('120골드가 필요해');return}state.coins-=120;state.expanded=true;saveSoon();updateHUD();toast('🏝️ 동쪽 야생지대가 크게 열렸어!')}

function startFishing(){if(fishing)return;fishing={pos:0,dir:1,speed:.7};pressed.clear();ui.fishing.showModal();const tick=()=>{if(!fishing)return;fishing.pos+=fishing.dir*fishing.speed*1.6;if(fishing.pos>=100){fishing.pos=100;fishing.dir=-1}if(fishing.pos<=0){fishing.pos=0;fishing.dir=1}ui.fishMarker.style.left=`${fishing.pos}%`;fishingFrame=requestAnimationFrame(tick)};fishingFrame=requestAnimationFrame(tick)}
function catchFish(){if(!fishing)return;const ok=fishing.pos>=42&&fishing.pos<=62;stopFishing();if(ok){state.inventory.fish++;saveSoon();toast('🐟 물고기 +1')}else toast('놓쳤어')}
function stopFishing(){fishing=null;cancelAnimationFrame(fishingFrame);fishingFrame=0;if(ui.fishing.open)ui.fishing.close()}

function updateWorkers(dt){if(state.workers<=0){state.workerFeedTimer=0;state.workerWorkTimer=0;return}state.workerWorkTimer+=dt;state.workerDeliveryTimer+=dt;state.workerFeedTimer+=dt;
  for(const p of state.plots){if(p.state==='growing'&&!p.watered){p.watered=true;p.wateredAt=Date.now()}if(p.ready){p.state='empty';p.watered=false;p.wateredAt=0;p.ready=false;state.workerStorage.food+=10;state.workerStorage.crop+=1}}
  while(state.workerWorkTimer>=WORK_TICK){state.workerWorkTimer-=WORK_TICK;state.workerStorage.wood+=state.workers;state.workerStorage.stone+=state.workers}
  if(state.workerDeliveryTimer>=DELIVERY_INTERVAL){state.workerDeliveryTimer%=DELIVERY_INTERVAL;const s=state.workerStorage;state.inventory.wood+=s.wood;state.inventory.stone+=s.stone;state.inventory.food+=s.food;state.inventory.crop+=s.crop;const total=s.wood+s.stone+s.food+s.crop;if(total)toast(`🧺 노비 작업물 지급 · 나무${s.wood} 돌${s.stone} 식량${s.food} 농작물${s.crop}`);state.workerStorage={wood:0,stone:0,food:0,crop:0};saveSoon()}
  if(state.workerFeedTimer>=FEED_INTERVAL){state.workerFeedTimer%=FEED_INTERVAL;feedWorkers()}
}
function feedWorkers(){let survivors=0;for(let i=0;i<state.workers;i++){if(state.inventory.food>=FEED_COST){state.inventory.food-=FEED_COST;survivors++}}const dead=state.workers-survivors;state.workers=survivors;saveSoon();if(dead>0)toast(`⚠️ 식량 부족으로 노비 ${dead}명이 굶어 죽었어`);else toast(`🍖 노비 급식 -${survivors*FEED_COST}`)}

function updateRaid(dt){
  const fort=getFort();
  if(!raidActive){
    state.raidTimer+=dt;
    const remaining=raidInterval()-state.raidTimer;
    if(remaining>30)raidWarningShown=false;
    if(!raidWarningShown&&remaining<=30&&remaining>0&&!fort?.siegeRequested){
      raidWarningShown=true;toast('🔔 정찰대 경보! 30초 뒤 습격이 시작돼');
    }
    if(fort?.siegeRequested || state.raidTimer>=raidInterval())startRaid();
    return;
  }
  if(grandSiege){
    grandSiege.elapsed+=dt;
    // 부대는 최대 110명까지 동시에 유지하고, 전투가 진행되면 후속 부대를 출진시킨다.
    if(grandSiege.wave<SIEGE_WAVE_SIZES.length &&
       grandSiege.elapsed>=grandSiege.nextWaveAt && enemies.length<90)spawnSiegeWave();
  }
  updateRaidCombat(dt);
  if(game.siegeSurrendered){
    enemies=[];game.enemies=enemies;game.siegeSurrendered=false;
    raidActive=false;game.raidActive=false;grandSiege=null;game.grandSiege=null;
    state.raidTimer=0;saveSoon();toast('🏰 성채가 함락됐어! 성벽과 성채를 수리해');
    return;
  }
  if(enemies.length===0 && (!grandSiege || grandSiege.wave>=SIEGE_WAVE_SIZES.length)){
    if(grandSiege){const f=getFort();if(f){f.siegeVictories=(Number(f.siegeVictories)||0)+1;f.honor=Math.min(999,(Number(f.honor)||0)+10);f.morale=Math.min(100,(Number(f.morale)||65)+8)}}
    raidActive=false;game.raidActive=false;grandSiege=null;game.grandSiege=null;
    state.raidTimer=0;saveSoon();toast('✅ 습격 방어 성공');
  }
}
function startRaid(){
  const fort=getFort(),auto=fort?.siegeAuto||'off';
  const siegeEnabled=!!fort?.siegeRequested||(!!fort&&fort.siegeAuto==='always')||
    (!!fort&&auto==='third'&&state.raidNumber===2);
  if(fort)fort.siegeRequested=false;
  state.raidTimer=0;raidWarningShown=false;state.raidNumber=(state.raidNumber%3)+1;
  raidActive=true;game.raidActive=true;selectedWolfId=null;enemies=[];
  // 기존 일반 습격/특수 습격 로직을 그대로 실행한다.
  if(state.raidNumber===1)for(let i=0;i<3;i++)enemies.push(createUnit('soldier',true));
  else if(state.raidNumber===2){
    for(let i=0;i<3;i++)enemies.push(createUnit('soldier',true));
    for(let i=0;i<2;i++)enemies.push(createUnit('archer',true));
  }else enemies.push(createUnit('soldier',true,true));
  if(siegeEnabled && fort?.wallTier && state.villageDevelopment?.townHallBuilt){
    grandSiege={wave:0,elapsed:0,nextWaveAt:.6,spawned:0};
    game.grandSiege=grandSiege;
    toast('🚩 대공성전 개시! 성문과 성벽을 방어해');
  }else{
    grandSiege=null;game.grandSiege=null;
    toast(state.raidNumber===3?'👹 보스 습격!':`⚠️ ${state.raidNumber}차 습격!`);
  }
  game.enemies=enemies;saveSoon();
}
function spawnSiegeWave(){
  if(!grandSiege)return;
  const stage=grandSiege.wave,n=SIEGE_WAVE_SIZES[stage];
  const roles=['soldier','archer','soldier','soldier','cavalry','shield','archer','ladder'];
  for(let i=0;i<n;i++){
    const kind=i===0&&stage>=1?'ram':
       i===1&&stage>=3?'siegeTower':
       i===2&&stage>=2?'trebuchet':
       i===3&&stage>=2?'sapper':roles[(i+stage)%roles.length];
    const u=createUnit(kind==='archer'?'archer':'soldier',true);
    u.kind=kind;u._grandSiege=true;
    const flank=(i%3),lane=flank===0?455:flank===1?610:805;
    const rank=Math.floor(i/3);
    u.x=1650+(rank%10)*42+stage*45;
    u.y=lane+(rank%4-1.5)*22;
    u._siegeLane=kind==='ram'?610:kind==='siegeTower'?455:kind==='sapper'?805:kind==='trebuchet'?610:lane;
     if(kind==='trebuchet'){u.x=1840+stage*45;u.y=610;Object.assign(u,{hp:410,maxHp:410,attack:0,speed:16,siegeDamage:110,siegeCooldown:4.8,ammo:8})}
     if(kind==='ladder')Object.assign(u,{hp:140,maxHp:140,speed:84,siegeCooldown:3.5,wallClimb:true});
     if(kind==='shield')Object.assign(u,{hp:240,maxHp:240,speed:45,attack:7,range:48});
    if(kind==='ram')Object.assign(u,{hp:1050,maxHp:1050,attack:0,speed:28,siegeDamage:145,siegeCooldown:2.2});
    if(kind==='siegeTower')Object.assign(u,{hp:1650,maxHp:1650,attack:0,speed:23,siegeDamage:120,siegeCooldown:2.6});
    if(kind==='sapper')Object.assign(u,{hp:180,maxHp:180,attack:0,speed:90,siegeDamage:72,siegeCooldown:1.2});
    enemies.push(u);
  }
  grandSiege.wave++;grandSiege.spawned+=n;
  grandSiege.nextWaveAt=grandSiege.elapsed+12;
  game.enemies=enemies;
  toast(`🏹 대공성전 ${grandSiege.wave}/${SIEGE_WAVE_SIZES.length}차 공세 · 적군 ${n}명 증원`);
}
function updateRaidCombat(dt){for(const u of allies)updateCombatUnit(u,enemies,dt,false);for(const u of enemies)updateCombatUnit(u,allies,dt,true);allies=allies.filter(u=>u.hp>0);enemies=enemies.filter(u=>u.hp>0);game.allies=allies;game.enemies=enemies;saveArmyIfChanged()}
function updateCombatUnit(u,targets,dt,hostile){
  u.cool=Math.max(0,u.cool-dt);
  // 메인: 기존 공격력·사거리·재장전 간격은 유지하고 주둔 병사의 이동만 고정한다.
  if(!hostile&&u._fortPost){u.x=u._fortPost.x;u.y=u._fortPost.y}
  // 공성 병기는 병사 공격이 아니라 성문/벽 돌파를 우선하며, 기존 일반 습격 전투는 유지한다.
  if(hostile&&u._grandSiege){
    const fort=getFort(),walls=fort?.walls||{},lane=u._siegeLane||610;
    const key=lane<520?'north':lane>730?'south':'gate';
    if(u.kind==='trebuchet'&&u.ammo>0){
      // 투석기는 성벽 밖에서 실제 포격하며 유한 탄약을 소모한다.
      if(u.x>1770)moveToward(u,1760,lane,dt);
      return;
    }
    if(fort&&state.villageDevelopment?.townHallBuilt&&(Number(walls[key])||0)>0&&
      (key!=='gate'||fort.drawbridgeClosed!==false)&&!u._fortClimbed){
      if(u.x>1353||Math.abs(u.y-lane)>25)moveToward(u,1355,lane,dt);
      return;
    }
    if(SIEGE_MACHINES.has(u.kind)||u.kind==='ladder'||u._fortClimbed){
      moveToward(u,1010,1050,dt);
      return;
    }
  }
  const t=nearestLiving(u,targets);
  if(!t&&hostile){moveToward(u,barracks.x,barracks.y,dt);return}
  if(!t)return;
  const d=Math.hypot(t.x-u.x,t.y-u.y)||1;
  if(d>u.range){if(!u._fortPost)moveToward(u,t.x,t.y,dt)}
  else if(u.cool<=0){
    const fort=!hostile?getFort():null;
    const order=fort?.defenseOrder||'hold',morale=fort?.morale??65;
    const bonus=!hostile&&game.grandSiege?
      (0.85+morale/400)*(order==='volley'&&u.kind==='archer'?1.45:order==='counter'&&u.kind!=='archer'?1.4:1):1;
    t.hp-=u.attack*bonus;u.cool=u.kind==='archer'?1.15:.85
  }
}
function nearestLiving(u,arr){let b=null,bd=1e9;for(const t of arr){if(t.hp<=0)continue;const d=Math.hypot(t.x-u.x,t.y-u.y);if(d<bd){bd=d;b=t}}return b}
function moveToward(u,x,y,dt){
  const dx=x-u.x,dy=y-u.y,d=Math.hypot(dx,dy)||1;
  // 해자 이동 감소는 새 대공성전 병력에만 적용. 기존 유닛 속도는 건드리지 않는다.
  const speed=u.speed*(u._grandSiege?(u._siegeMoatFactor||1):1);
  const step=u._grandSiege?Math.min(d,speed*dt):speed*dt;
  u.x+=dx/d*step;u.y+=dy/d*step;
}
function saveArmyIfChanged(){const alive=allies.filter(u=>u.hp>0);if(alive.length!==state.army.length){state.army=alive.map(u=>({kind:u.kind}));saveSoon()}}

function makeWolf(id,x,y){return{id,x,y,homeX:x,homeY:y,hp:200,maxHp:200,attack:10,speed:68,cool:0,alive:true,respawnAt:0,wander:0,vx:0,vy:0}}
function commandWolfAt(sx,sy){if(!state.expanded||raidActive)return;const p=renderer.screenToWorld(game,sx,sy);let best=null,bd=46;for(const w of wolves){if(!w.alive)continue;const d=Math.hypot(w.x-p.x,w.y-p.y);if(d<bd){best=w;bd=d}}if(!best)return;selectedWolfId=best.id;game.selectedWolfId=best.id;toast(`🐺 늑대 지정! 병사 ${countKind('soldier')}명 출동`)}
function updateWolves(dt){const now=Date.now();for(const w of wolves){if(!w.alive){if(w.respawnAt&&now>=w.respawnAt){w.alive=true;w.hp=w.maxHp;w.x=w.homeX;w.y=w.homeY;w.respawnAt=0}continue}w.cool=Math.max(0,w.cool-dt);if(raidActive||selectedWolfId!==w.id){w.wander-=dt;if(w.wander<=0){const a=Math.random()*Math.PI*2;w.vx=Math.cos(a);w.vy=Math.sin(a);w.wander=1.5+Math.random()*2.5}const nx=w.x+w.vx*w.speed*.2*dt,ny=w.y+w.vy*w.speed*.2*dt;if(nx>1450&&nx<2800)w.x=nx;else w.vx*=-1;if(ny>220&&ny<980)w.y=ny;else w.vy*=-1;continue}
    const soldiers=allies.filter(u=>u.kind==='soldier'&&u.hp>0&&!u._fortPost);for(const s of soldiers){s.cool=Math.max(0,s.cool-dt);const d=Math.hypot(w.x-s.x,w.y-s.y)||1;if(d>s.range)moveToward(s,w.x,w.y,dt);else if(s.cool<=0){w.hp-=s.attack;s.cool=.85}}
    const target=nearestLiving(w,soldiers);if(target){const d=Math.hypot(target.x-w.x,target.y-w.y)||1;if(d>52)moveToward(w,target.x,target.y,dt);else if(w.cool<=0){target.hp-=w.attack;w.cool=.9}}
    if(w.hp<=0){w.alive=false;w.respawnAt=now+60000;selectedWolfId=null;game.selectedWolfId=null;toast('🐺 늑대를 처치했어!')}allies=allies.filter(u=>u.hp>0);game.allies=allies;saveArmyIfChanged()}}

function updatePeaceAllies(dt){if(raidActive)return;const wolf=wolves.find(w=>w.id===selectedWolfId&&w.alive);for(const u of allies){if(u._fortPost){u.x=u._fortPost.x;u.y=u._fortPost.y;continue}if(wolf&&u.kind==='soldier')continue;u.wander-=dt;if(u.wander<=0){const a=Math.random()*Math.PI*2;u.vx=Math.cos(a);u.vy=Math.sin(a);u.wander=1.2+Math.random()*2.2}const nx=u.x+u.vx*u.speed*.28*dt,ny=u.y+u.vy*u.speed*.28*dt;if(nx>350&&nx<1280)u.x=nx;else u.vx*=-1;if(ny>450&&ny<900)u.y=ny;else u.vy*=-1}}
function advanceClock(dt){clockCarry+=dt;if(clockCarry<.5)return;const ticks=Math.floor(clockCarry/.5);clockCarry-=ticks*.5;state.minutes+=ticks*5;state.playMinutes+=ticks*2.5/60;while(state.minutes>=1440){state.minutes-=1440;state.day++;state.weather=seededWeather(state.day);game.weather=state.weather;toast(`${state.day}일차 · ${state.weather}`)}updateHUD();saveSoon()}
function seededWeather(day){return Math.abs(Math.sin(day*91.731)*10000)%1<.28?'비':'맑음'}
function updateHUD(){
  const h=Math.floor(state.minutes/60),m=Math.floor(state.minutes%60),pm=h>=12,h12=((h+11)%12)+1;
  ui.day.textContent=`${state.day}일차`;
  ui.time.textContent=`${pm?'오후':'오전'} ${h12}:${String(m).padStart(2,'0')}`;
  ui.weather.textContent=state.weather==='비'?'🌧️ 비':'☀️ 맑음';
  ui.coins.textContent=String(state.coins);
  if(raidActive)ui.raid.textContent=grandSiege?
    `🏰 ${grandSiege.wave}/6차 · 적 ${enemies.length} · 성채 ${Math.ceil(getFort()?.keepHp??900)} · 사기 ${getFort()?.morale??65}`:
    `⚔️ 습격 ${state.raidNumber} · 적 ${enemies.length}`;
  else{
    const r=Math.max(0,Math.ceil(raidInterval()-state.raidTimer));
    ui.raid.textContent=`⏱️ 습격 ${Math.floor(r/60)}:${String(r%60).padStart(2,'0')}`;
  }
}
// 메인: 방향키는 영지 지도를 이동한다. 캐릭터 이동은 하지 않는다.
function updateCameraControl(dt){
  const dx=(pressed.has('right')?1:0)-(pressed.has('left')?1:0);
  const dy=(pressed.has('down')?1:0)-(pressed.has('up')?1:0);
  if(!dx&&!dy)return;
  game.siegeOverview=true;
  renderer.panCamera(-dx*480*dt,-dy*480*dt);
}
function updateHint(){
  ui.hint.textContent=raidActive?'성채 수비 중 · 병력과 성벽 상황을 확인해':'지도 드래그 · 건물 터치 · 성채에서 건설/방어 관리';
}
function frame(now){const dt=Math.min(.05,Math.max(0,(now-lastFrame)/1000));lastFrame=now;game.timeNow=Date.now();if(!runtime.paused&&!ui.panel.open&&!ui.fishing.open){updateCameraControl(dt);advanceClock(dt);updateCrops();updateWorkers(dt);updateRaid(dt);if(!raidActive){updatePeaceAllies(dt);updateWolves(dt)}}game.allies=allies;game.enemies=enemies;game.raidActive=raidActive;game.selectedWolfId=selectedWolfId;updateHUD();updateHint();renderer.draw(game);requestAnimationFrame(frame)}

allies=state.army.map(x=>createUnit(x.kind,false));game.allies=allies;updateHUD();requestAnimationFrame(frame);
