import { JaewoonVibeRuntime } from '../../assets/vibe-runtime.js';
import { IslandRendererV3 } from './render-v3.js';
import { snapFort,wallLine } from './castle-layout.js';
import { ECONOMY_BUILDINGS,getEconomy,constructEconomyBuilding,upgradeEconomyBuilding,economyStaff,economyTechStatus } from './production-buildings.js';

const GAME_ID='cozy-island';
const RAID_INTERVAL=120;
const FARM_GROW_MS=20000;
const WORKER_PRICE=50, WORKER_MAX=3, WORK_TICK=10, DELIVERY_INTERVAL=60, FEED_INTERVAL=180, FEED_COST=10;
const SOLDIER_MAX=12, ARCHER_MAX=10;
// 메인: 기존 병사·궁수의 공격력/체력/모집비는 유지한다. 새 병과만 추가한다.
export const RTS_UNIT_TYPES=Object.freeze({
 soldier:{name:'검병',icon:'⚔️',max:12,food:10,hp:100,attack:10,range:55,speed:76,rate:.85},
 archer:{name:'궁수',icon:'🏹',max:10,food:20,hp:55,attack:25,range:220,speed:64,rate:1.15},
 spearman:{name:'창병',icon:'🔱',max:9,food:14,wood:2,hp:120,attack:13,range:83,speed:71,rate:.9},
 crossbow:{name:'석궁병',icon:'🎯',max:7,food:24,wood:3,iron:1,hp:72,attack:34,range:265,speed:56,rate:1.75},
 shield:{name:'방패병',icon:'🛡️',max:6,food:18,wood:3,hp:210,attack:8,range:55,speed:47,rate:1.05},
 knight:{name:'기사',icon:'🐎',max:5,food:32,iron:4,coins:18,hp:240,attack:27,range:70,speed:105,rate:.8},
 sapper:{name:'공병',icon:'🔨',max:6,food:16,wood:4,stone:2,hp:100,attack:12,siegeDamage:35,range:64,speed:80,rate:1},
 ram:{name:'공성추',icon:'🪵',max:3,food:22,wood:18,stone:8,hp:450,attack:8,siegeDamage:85,range:110,speed:28,rate:2},
 trebuchet:{name:'투석기',icon:'💥',max:3,food:25,wood:20,stone:20,hp:270,attack:10,siegeDamage:100,range:415,speed:18,rate:4,ammo:12},
 siegeTower:{name:'공성탑',icon:'🏰',max:2,food:25,wood:28,stone:12,hp:650,attack:12,siegeDamage:67,range:100,speed:24,rate:2.7}
});
const DEFAULT_STATE={
  version:3,day:1,minutes:480,coins:40,weather:'맑음',expanded:false,decor:[],barracksBuilt:false,army:[],raidTimer:0,raidNumber:0,
  inventory:{wood:0,stone:0,flower:0,fish:0,crop:0,seeds:3,food:0},
  plots:Array.from({length:6},()=>({state:'empty',watered:false,wateredAt:0,ready:false})),
  player:{x:730,y:640},playMinutes:0,
  workers:0,workerStorage:{wood:0,stone:0,food:0,crop:0},workerWorkTimer:0,workerDeliveryTimer:0,workerFeedTimer:0
};
const world={w:3100,h:1200};
// 시스템의 명시적 새 게임 요청일 때만 자동저장 키를 초기화. 수동 3슬롯은 보존.
if(sessionStorage.getItem('cozy-island:new-game')==='1'){
 sessionStorage.removeItem('cozy-island:new-game');
 localStorage.removeItem('jaewoon-games:cozy-island');
}
const runtime=new JaewoonVibeRuntime({gameId:GAME_ID,autosaveDelay:350}).boot({errorReporter:e=>console.error('[포근섬 오류]',e)});
const state=normalizeState(runtime.loadProgress(DEFAULT_STATE));
getEconomy(state); // 기존 세이브를 살리고 처음부터 건설/목재/석재/노동력이 가동되게 한다.
const canvas=document.querySelector('#game');
const renderer=new IslandRendererV3(canvas);
const player={x:state.player.x,y:state.player.y,speed:185};
const pressed=new Set();
const BUILDABLE_AREA={minX:130,maxX:2320,minY:85,maxY:1580};
const cancelBuild=document.querySelector('#cancelBuild'),
      buildStatus=document.querySelector('#buildStatus'),
      rotateGate=document.querySelector('#rotateGate');
function updateBuildStatus(){
 const b=game.buildingPlacement;
 if(!b){if(buildStatus)buildStatus.hidden=true;if(rotateGate)rotateGate.hidden=true;return}
 if(rotateGate){
   rotateGate.hidden=b.id!=='fort:gate';
   rotateGate.textContent='🔄 성문 방향: '+(b.axis==='horizontal'?'가로':b.axis==='vertical'?'세로':'자동');
 }
 if(!buildStatus)return;
 buildStatus.hidden=false;
 if(b.id==='fort:wall'){
   const detail={start:b.startAt||b.at,end:b.at};
   window.dispatchEvent(new CustomEvent('cozy:preview-wall-line',{detail}));
   b.preview=detail.points||wallLine(detail.start,detail.end,35);
   b.previewValid=!!detail.ok;
   buildStatus.textContent='🧱 '+(detail.count||0)+'칸 · 목재 '+(detail.wood||0)+' · 돌 '+(detail.stone||0)+
     (detail.ok?' ✅ 설치 가능':' ⛔ '+(detail.reason||'자원 또는 인부 통행 확인'));
 }else{
   b.preview=null;b.previewValid=true;
   buildStatus.textContent=b.id==='fort:gate'?'🚪 성문은 인부 통행 허용 · 주변 성벽 방향에 정렬':'🏗️ 지도 터치로 건설';
 }
}
function cancelBuildPlacement(){
 game.buildingPlacement=null;
 if(cancelBuild)cancelBuild.hidden=true;
 if(buildStatus)buildStatus.hidden=true;
 if(rotateGate)rotateGate.hidden=true;
}
cancelBuild?.addEventListener('click',cancelBuildPlacement);
rotateGate?.addEventListener('click',()=>{
 const mode=game.buildingPlacement;if(mode?.id!=='fort:gate')return;
 mode.axis=mode.axis==='auto'?'horizontal':mode.axis==='horizontal'?'vertical':'auto';
 updateBuildStatus();
});
window.addEventListener('keydown',e=>{if(e.key==='Escape')cancelBuildPlacement()});
window.addEventListener('cozy:place-building',e=>{
 const id=e.detail?.id,def=ECONOMY_BUILDINGS.find(x=>x.id===id);if(!def)return;
 game.buildingPlacement={id,at:{x:Math.max(200,Math.min(1850,def.x)),y:Math.max(200,Math.min(1170,def.y))}};
 if(cancelBuild){cancelBuild.hidden=false;cancelBuild.textContent='✕ '+def.name+' 배치 취소'}
 toast('🏗️ '+def.name+' · 지도에서 건설 위치를 터치해');updateBuildStatus();
});
window.addEventListener('cozy:place-fort',e=>{
 const id=e.detail?.id;if(!['wall','gate','tower','spikes','oil','pit','net','log','barrel'].includes(id))return;
 game.buildingPlacement={id:'fort:'+id,at:{x:1350,y:690},axis:'auto',startAt:null,preview:null};
 if(cancelBuild){cancelBuild.hidden=false;cancelBuild.textContent='✕ 성곽 배치 취소'}
 toast(id==='wall'?'🧱 성벽을 드래그하여 연속 시공':'🏰 성문·망루·함정을 지도에 설치해');updateBuildStatus();
});
function placeEconomyAt(at){
 const mode=game.buildingPlacement;if(!mode)return;
 const step=mode.id.startsWith('fort:')?90:30;
 const p={x:Math.round(at.x/step)*step,y:Math.round(at.y/step)*step};
 if(mode.id.startsWith('fort:')){
   const detail={id:mode.id.slice(5),at:p,axis:mode.axis||'auto',success:false};
   window.dispatchEvent(new CustomEvent('cozy:construct-fort',{detail}));
   if(detail.success){cancelBuildPlacement();updateHUD()}
   return;
 }
 if(p.x<BUILDABLE_AREA.minX||p.x>BUILDABLE_AREA.maxX||p.y<BUILDABLE_AREA.minY||p.y>BUILDABLE_AREA.maxY){
   toast('영지 안의 빈 땅에 건설해야 해');return;
 }
 const econ=getEconomy(state);
 const spots=Object.values(econ.buildings).flatMap(x=>x.sites||[]);
 if(spots.some(q=>Math.hypot(q.x-p.x,q.y-p.y)<78)||Math.hypot(p.x-1010,p.y-1090)<100){
   toast('건물과 겹쳐서 건설할 수 없어');return;
 }
 if(constructEconomyBuilding(mode.id,p)){cancelBuildPlacement();updateHUD()}
 else toast('건설 조건을 확인해');
}

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
game.screenToWorld=(sx,sy)=>renderer.screenToWorld(game,sx,sy);
game.centerStrategyView=()=>{game.siegeOverview=true;renderer.centerCamera()};
const ui={
  help:qs('#helpCommand'),day:qs('#dayText'),time:qs('#timeText'),weather:qs('#weatherText'),coins:qs('#coinText'),economy:qs('#economyText'),raid:qs('#raidText'),hint:qs('#hint'),toast:qs('#toast'),inventory:qs('#inventoryButton'),castle:qs('#castleCommand'),barracks:qs('#barracksCommand'),workers:qs('#workersCommand'),fishingCommand:qs('#fishingCommand'),trade:qs('#tradeCommand'),center:qs('#centerCommand'),zoomIn:qs('#zoomIn'),zoomOut:qs('#zoomOut'),panel:qs('#panel'),panelTitle:qs('#panelTitle'),panelBody:qs('#panelBody'),panelClose:qs('#panelClose'),fishing:qs('#fishing'),fishMarker:qs('#fishMarker'),catch:qs('#catchButton'),cancelFishing:qs('#cancelFishing')
};
function qs(s){return document.querySelector(s)}
function normalizeState(raw){
  const base=structuredClone(DEFAULT_STATE), r=raw||{};
  const oldWorkers=typeof r.workers==='object'&&r.workers?Math.floor(Number(r.workers.count)||0):Math.floor(Number(r.workers)||0);
  const oldBuf=typeof r.workers==='object'&&r.workers?.buffer?r.workers.buffer:r.workerStorage||{};
  const inv={...base.inventory,...(r.inventory||{})};
  const plots=Array.isArray(r.plots)&&r.plots.length===6?r.plots.map(p=>({state:'empty',watered:false,wateredAt:0,ready:false,...p})):base.plots;
  return {...base,...r,version:3,inventory:inv,plots,
    army:Array.isArray(r.army)?r.army.filter(x=>Object.hasOwn(RTS_UNIT_TYPES,x?.kind)).slice(0,70):[],
    workers:Math.max(0,oldWorkers),
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
runtime.bindTouchButton(ui.workers,()=>window.dispatchEvent(new CustomEvent('cozy:open-construction',{detail:{group:'industry'}})));
runtime.bindTouchButton(ui.fishingCommand,openWar);
runtime.bindTouchButton(ui.trade,()=>window.dispatchEvent(new Event('cozy:open-trade')));
runtime.bindTouchButton(ui.center,()=>{game.siegeOverview=true;renderer.centerCamera();toast('🏰 성채 전장 전체 보기')});
runtime.bindTouchButton(ui.zoomIn,()=>{game.siegeOverview=true;renderer.changeZoom(1.2)});
runtime.bindTouchButton(ui.zoomOut,()=>{game.siegeOverview=true;renderer.changeZoom(1/1.2)});
runtime.bindTouchButton(ui.panelClose,()=>ui.panel.close());
runtime.bindTouchButton(ui.catch,catchFish);
runtime.bindTouchButton(ui.cancelFishing,stopFishing);
window.addEventListener('resize',()=>renderer.resize());
window.addEventListener('jaewoon:pause',e=>{if(e.detail.paused)pressed.clear()});
// 모바일: 두 손가락 확대/축소 시 건설/선택 터치를 억제한다.
let pointerGesture=null,pinchDistance=0,pinchActive=false;
const touchPoints=new Map();
canvas.addEventListener('pointerdown',e=>{
  if(e.pointerType==='mouse'&&e.button!==0)return;
  if(e.pointerType==='touch'){
    touchPoints.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(touchPoints.size>=2){
      const pts=[...touchPoints.values()];
      pinchDistance=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y);
      pinchActive=true;pointerGesture=null;
      canvas.setPointerCapture?.(e.pointerId);return;
    }
  }
  if(pinchActive)return;
  pointerGesture={id:e.pointerId,x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,moved:false};
  if(game.buildingPlacement?.id==='fort:wall'){
    const start=snapFort(renderer.screenToWorld(game,e.clientX,e.clientY));
    game.buildingPlacement.startAt=start;
    game.buildingPlacement.at=start;
    game.buildingPlacement.preview=[start];
    updateBuildStatus();
  }
  canvas.setPointerCapture?.(e.pointerId);
});
canvas.addEventListener('pointermove',e=>{
  if(touchPoints.has(e.pointerId)){
    touchPoints.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(touchPoints.size>=2){
      const p=[...touchPoints.values()],d=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);
      if(pinchDistance>8&&d>8)renderer.changeZoom(Math.max(.88,Math.min(1.12,d/pinchDistance)));
      pinchDistance=d;game.siegeOverview=true;return;
    }
  }
  if(pinchActive||!pointerGesture||pointerGesture.id!==e.pointerId)return;
  const g=pointerGesture,dx=e.clientX-g.x,dy=e.clientY-g.y;
  if(game.buildingPlacement){
    game.buildingPlacement.at=snapFort(renderer.screenToWorld(game,e.clientX,e.clientY));
    if(game.buildingPlacement.id==='fort:wall')updateBuildStatus();
    return;
  }
  if(g.moved||Math.hypot(e.clientX-g.startX,e.clientY-g.startY)>9){
    g.moved=true;game.siegeOverview=true;renderer.panCamera(dx,dy);
  }
  g.x=e.clientX;g.y=e.clientY;
});
canvas.addEventListener('pointercancel',e=>{
  touchPoints.delete(e.pointerId);pointerGesture=null;
  if(!touchPoints.size){pinchActive=false;pinchDistance=0;}
  if(game.buildingPlacement?.id==='fort:wall')game.buildingPlacement.startAt=null;
  updateBuildStatus();
});
canvas.addEventListener('pointerup',e=>{
  touchPoints.delete(e.pointerId);
  if(pinchActive){
    if(!touchPoints.size){pinchActive=false;pinchDistance=0;}
    pointerGesture=null;return;
  }
  if(!pointerGesture||pointerGesture.id!==e.pointerId)return;
  const g=pointerGesture;pointerGesture=null;
  if((g.moved&&!game.buildingPlacement)||ui.panel.open||ui.fishing.open||runtime.paused)return;
  const now=performance.now();
  if(game.buildingPlacement){
    const at=renderer.screenToWorld(game,e.clientX,e.clientY),mode=game.buildingPlacement;
    if(mode.id==='fort:wall'){
      const detail={start:mode.startAt||snapFort(at),end:snapFort(at),success:false};
      window.dispatchEvent(new CustomEvent('cozy:construct-wall-line',{detail}));
      if(detail.success){cancelBuildPlacement();updateHUD()}
      else updateBuildStatus();
      return;
    }
    placeEconomyAt(at);return;
  }
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
  // 도움말은 마을회관의 건설 카탈로그를 연다.
  window.dispatchEvent(new Event('cozy:open-construction'));return;

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
    if(target==='castle')document.querySelector('#castleManageButton')?.click();
    else if(target==='barracks')openBarracks();
    else if(target==='fish')startFishing();
    else openWorkerShop();
  }));
}
function openInventory(){if(ui.fishing.open)return;ui.panelTitle.textContent='영지 자원';const i=state.inventory;ui.panelBody.innerHTML=`<div class="inventory-grid">${itemCard('🪵 나무',i.wood)}${itemCard('🪨 돌',i.stone)}${itemCard('🍖 식량',i.food)}${itemCard('🌼 꽃',i.flower)}${itemCard('🐟 물고기',i.fish)}${itemCard('🥕 농작물',i.crop)}${itemCard('🌱 씨앗',i.seeds)}</div><p class="panel-note">노비 ${state.workers}/${WORKER_MAX} · 병사 ${countKind('soldier')}/${SOLDIER_MAX} · 궁수 ${countKind('archer')}/${ARCHER_MAX}</p><p class="panel-note">중세 아트: SketchyLogic · Yar · Seth Galbraith · rubberduck · feudalwars. <a href="../../assets/shared/medieval/license.txt" target="_blank" rel="noopener">출처·라이선스</a></p>`;ui.panel.showModal()}
function countKind(kind){return allies.filter(u=>u.kind===kind&&u.hp>0).length}

// 과거 수동 채집·물주기·집 꾸미기 상호작용을 전략 명령으로 교체한다.
// 지도 단일 터치: 저장된 실제 건물 좌표를 먼저 찾아 정보/강화 패널을 연다.
function nearestInteraction(at=player,radius=118){
 const special=[
  {type:'barracks',x:barracks.x,y:barracks.y},
  {type:'hall',x:1010,y:1090},{type:'tower',x:400,y:1090}
 ];
 const e=getEconomy(state),items=[...special];
 const structures=state.villageDevelopment?.fortification?.structures||[];
 structures.forEach((p,index)=>{if(p.hp>0&&Number.isFinite(p.x)&&Number.isFinite(p.y))items.push({type:'fort',index,x:p.x,y:p.y})});
 for(const def of ECONOMY_BUILDINGS){
  const entry=e.buildings[def.id];
  for(const site of (entry?.sites||[]).slice(0,entry.count||0))
   items.push({type:'economy',id:def.id,x:site.x,y:site.y});
 }
 const pick=items.map(item=>({...item,d:Math.hypot(at.x-item.x,at.y-item.y)}))
   .sort((a,b)=>a.d-b.d)[0];
 return pick?.d<=radius?pick:null;
}
function interactionHint(t){return t?'건물 터치: 정보·강화':'한 손가락 이동 · 두 손가락 확대 · 빈 땅 드래그'}
function interact(){if(!ui.panel.open)window.dispatchEvent(new Event('cozy:open-construction'))}
function activateInteraction(t){
 if(runtime.paused||ui.panel.open)return;
 if(t.type==='barracks'){openBarracks();return;}
 if(t.type==='fort'){
   window.dispatchEvent(new CustomEvent('cozy:inspect-fort',{detail:{index:t.index}}));return;
 }
 if(t.type==='economy'){openBuilding(t.id);return;}
 window.dispatchEvent(new CustomEvent('cozy:open-construction',{detail:{group:'defense'}}));
}
function openBuilding(id){
 const def=ECONOMY_BUILDINGS.find(item=>item.id===id),entry=getEconomy(state).buildings[id];
 if(!def||!entry?.count)return;
 const level=entry.level||1,wood=def.wood+level*5,stone=def.stone+level*3,gold=def.gold+level*6;
 ui.panelTitle.textContent=def.icon+' '+def.name+' · '+level+'단계';
 ui.panelBody.innerHTML='<p class="panel-note">'+def.desc+'</p>'+
  '<div class="inventory-grid">'+itemCard('건물 수',entry.count)+itemCard('일꾼/채',def.jobs)+
  itemCard('현재 단계',level)+(def.out?itemCard('주기 생산',def.amount*level):'')+'</div>'+
  '<p class="panel-note">강화는 같은 종류 건물 전체의 생산 단계를 올립니다. 최대 3단계.</p>'+
  '<button class="choice" type="button" data-building-upgrade '+(level>=3?'disabled':'')+
  '><span>⬆️ '+def.name+' 강화 '+(level>=3?'· 최고 단계':'→ '+(level+1)+'단계')+
  '</span><b>나무 '+wood+' · 돌 '+stone+' · 금화 '+gold+'</b></button>'+
  '<button class="choice" type="button" data-building-list>🏗️ 건설 목록 보기</button>';
 ui.panel.showModal();
 ui.panelBody.querySelector('[data-building-upgrade]')?.addEventListener('click',()=>{
  if(upgradeEconomyBuilding(id)){updateHUD();openBuildingContentRefresh(id);}
 });
 ui.panelBody.querySelector('[data-building-list]')?.addEventListener('click',()=>{
   ui.panel.close();window.dispatchEvent(new CustomEvent('cozy:open-construction',{detail:{group:def.group}}));
 });
}
function openBuildingContentRefresh(id){ui.panel.close();openBuilding(id);}
function collectNode(n){const now=Date.now();if(n.readyAt>now){toast('조금 뒤에 다시 생겨');return}if(n.kind==='tree'){state.inventory.wood++;toast('🪵 나무 +1')}else if(n.kind==='rock'){state.inventory.stone++;toast('🪨 돌 +1')}else{state.inventory.flower++;toast('🌼 꽃 +1')}n.readyAt=now+30000;saveSoon()}
function talkTo(n){ui.panelTitle.textContent=n.name;const extra=n.id==='sky'?`<button class="choice" data-seed><span>🌱 씨앗 3개</span><b>15골드</b></button>`:'';ui.panelBody.innerHTML=`<p class="panel-note">${n.line}</p><div class="choice-grid">${extra}</div>`;ui.panel.showModal();ui.panelBody.querySelector('[data-seed]')?.addEventListener('click',()=>{if(state.coins<15){toast('골드가 부족해');return}state.coins-=15;state.inventory.seeds+=3;saveSoon();updateHUD();toast('🌱 씨앗 +3')})}
function openBarracks(){ui.panelTitle.textContent=state.barracksBuilt?'병영':'병영 건설';renderBarracks();ui.panel.showModal()}
function renderBarracks(){
 if(!state.barracksBuilt){
  ui.panelBody.innerHTML='<p class="panel-note">병영을 지으면 다양한 병과와 공성 병기를 모집할 수 있습니다.</p>'+
   '<button class="choice" data-build>🏕️ 병영 건설 · 나무 5 · 돌 3</button>';
  ui.panelBody.querySelector('[data-build]')?.addEventListener('click',buildBarracks);return;
 }
 const inv=state.inventory;
 ui.panelBody.innerHTML='<p class="panel-note">병사 '+allies.filter(u=>u.hp>0).length+
  '명 · 식량 '+Math.floor(inv.food||0)+' · 철 '+Math.floor(inv.iron||0)+
  ' · 공성 장비는 적 성벽에 추가 피해를 줍니다.</p>'+
  '<div class="realm-build-grid">'+Object.entries(RTS_UNIT_TYPES).map(([id,d])=>{
   const tech=economyTechStatus(state,id),n=countKind(id),cost=['식량 '+d.food,
    ...(d.wood?['나무 '+d.wood]:[]),...(d.stone?['돌 '+d.stone]:[]),
    ...(d.iron?['철 '+d.iron]:[]),...(d.coins?['금화 '+d.coins]:[])].join(' · ');
   const affordable=Number(inv.food||0)>=d.food&&Number(inv.wood||0)>=(d.wood||0)&&
    Number(inv.stone||0)>=(d.stone||0)&&Number(inv.iron||0)>=(d.iron||0)&&
    Number(state.coins||0)>=(d.coins||0);
   return '<article class="realm-build-card"><div class="realm-build-title"><span class="realm-icon">'+
    d.icon+'</span><div><b>'+d.name+'</b><small>체력 '+d.hp+' · 공격 '+d.attack+
    ' · 사거리 '+d.range+(d.siegeDamage?' · 성벽 추가 '+d.siegeDamage:'')+
    '</small></div><strong>'+n+'/'+d.max+'</strong></div><div class="realm-build-actions">'+
    '<button class="choice" data-rec="'+id+'" '+(!affordable||n>=d.max||!tech.unlocked?'disabled':'')+
    '>'+(tech.unlocked?'모집 · '+cost:'🔒 '+tech.missing.join(' + ')+' 필요')+'</button></div></article>';
  }).join('')+'</div>';
 ui.panelBody.querySelectorAll('[data-rec]').forEach(b=>b.addEventListener('click',()=>recruit(b.dataset.rec)));
}
function buildBarracks(){
 if(state.inventory.wood<5||state.inventory.stone<3){toast('재료가 부족해');return}
 state.inventory.wood-=5;state.inventory.stone-=3;state.barracksBuilt=true;
 saveSoon();ui.panel.close();toast('🏕️ 병영 완성');
}
function recruit(kind){
 const d=RTS_UNIT_TYPES[kind];if(!d)return;
 const tech=economyTechStatus(state,kind);if(!tech.unlocked)return toast('🔒 해금 조건: '+tech.missing.join(' · '));
 if(countKind(kind)>=d.max){toast('이 병종 최대 인원에 도달했어');return}
 const inv=state.inventory;
 for(const key of ['food','wood','stone','iron'])if(Number(inv[key]||0)<(d[key]||0))
  return toast(d.name+' 자원 부족 · '+key);
 if(state.coins<(d.coins||0))return toast('모집 금화 부족');
 for(const key of ['food','wood','stone','iron'])if(d[key])inv[key]-=d[key];
 if(d.coins)state.coins-=d.coins;
 allies.push(createUnit(kind,false));game.allies=allies;
 saveSoon();renderBarracks();toast(d.icon+' '+d.name+' 합류');
}
function createUnit(kind,enemy,boss=false){
 const def=RTS_UNIT_TYPES[kind]||RTS_UNIT_TYPES.soldier,hp=boss?def.hp*7:def.hp;
 return{id:unitId++,kind,enemy,boss,hp,maxHp:hp,
  attack:boss?def.attack*3:def.attack,range:def.range,speed:def.speed,
  siegeDamage:def.siegeDamage||0,ammo:def.ammo||0,rate:def.rate,
  cool:Math.random()*.5,wander:0,vx:0,vy:0,
  x:enemy?1490+Math.random()*60:barracks.x+(Math.random()-.5)*70,
  y:enemy?550+Math.random()*180:barracks.y+60+Math.random()*60};
}
function openWorkerShop(){window.dispatchEvent(new CustomEvent('cozy:open-construction',{detail:{group:'industry'}}))}
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


// 적 영주도 식량·군대·금화를 생산해 전략적으로 출병한다.
// 마을회관 파괴 즉시 해당 영주가 패배하고 3개 모두 점령 시 게임 승리.
const ENEMY_BLUEPRINTS=[
 {id:'iron',name:'철혈 영주',x:4550,y:850,focus:'rush',region:'동쪽 붉은 협곡',color:'#b64e39'},
 {id:'stone',name:'석벽 영주',x:4520,y:-2750,focus:'defense',region:'북동쪽 설산',color:'#8b8c80'},
 {id:'gold',name:'황금 영주',x:-2450,y:-2650,focus:'trade',region:'북서쪽 황금 초원',color:'#d5ac52'}
];
let fieldEnemies=[],offensiveTarget=null;
function getEnemyLords(){
 if(!Array.isArray(state.enemyLordsV5))state.enemyLordsV5=ENEMY_BLUEPRINTS.map((d,i)=>({
  ...d,hp:230+i*80,maxHp:230+i*80,wallHp:110+i*85,maxWallHp:110+i*85,
  wood:15,stone:15,food:60,coins:50,troops:3+i*2,
  economyClock:0,decisionClock:0,defeated:false,buildings:3+i*2
 }));
 // 구버전 세이브의 적 좌표를 네 왕국 신지도 좌표로 이관, HP·승리·자원 등은 보존.
 for(const d of ENEMY_BLUEPRINTS){
   const lord=state.enemyLordsV5.find(l=>l?.id===d.id);
   if(lord){lord.x=d.x;lord.y=d.y;lord.region=d.region;lord.name=d.name;}
 }
 return state.enemyLordsV5;
}
function advanceEnemyLords(dt){
 const lords=getEnemyLords();let attacker=null;
 for(const lord of lords){
   if(lord.defeated)continue;
   lord.economyClock=(Number(lord.economyClock)||0)+dt;
   lord.decisionClock=(Number(lord.decisionClock)||0)+dt;
   if(lord.economyClock>=8){
     lord.economyClock%=8;
     if(state.strongholdDiplomacy?.[lord.id]==='ally'){
       state.coins+=2;state.inventory.wood=(Number(state.inventory.wood)||0)+2;
     }
     const harvest=lord.focus==='trade'?9:lord.focus==='defense'?5:6;
     lord.wood+=harvest;lord.stone+=lord.focus==='defense'?7:4;
     lord.food+=10;lord.coins+=lord.focus==='trade'?10:5;
     if(lord.food>=7&&lord.coins>=5&&lord.troops<30){
       lord.food-=7;lord.coins-=5;lord.troops+=lord.focus==='rush'?3:2;
     }
     if(lord.focus==='defense'&&lord.stone>=9&&lord.wallHp<lord.maxWallHp){
       lord.stone-=9;lord.wallHp=Math.min(lord.maxWallHp,lord.wallHp+28);
     }
   }
   const threshold=lord.focus==='rush'?9:lord.focus==='trade'?18:23;
   if(!attacker&&state.strongholdDiplomacy?.[lord.id]!=='ally'&&lord.troops>=threshold&&lord.decisionClock>(lord.focus==='rush'?65:95)&&!offensiveTarget){
     lord.decisionClock=0;attacker=lord;
   }
 }
 return attacker;
}
function showGameResult(title,description){
 const el=document.querySelector('#gameResult');
 if(!el)return;el.hidden=false;
 el.querySelector('h2').textContent=title;
 el.querySelector('p').textContent=description;
}
// 병력 지휘: 개별 액션 캐릭터 없이 왕국 부대에 직접 전술 명령을 내려요.
function issueArmyOrder(command){
 const living=allies.filter(u=>u.hp>0);
 if(command==='rally'){
   for(const u of living){delete u._fortPost;delete u._expedition;
      u._tacticalOrder='rally';u.x=1080+(u.id%6)*22;u.y=810+Math.floor(u.id%9/6)*28;}
   toast('🚩 수비대가 성 아래에 집결했어');
 }else if(command==='hold'){
   for(const u of living){u._tacticalOrder='hold';delete u._expedition;}
   toast('🛡️ 성벽 사수');
 }else if(command==='attack'){
   for(const u of living)u._tacticalOrder='attack';
   toast('⚔️ 공격 우선 명령');
 }else if(command==='retreat'){
   for(const u of living){delete u._expedition;u._tacticalOrder='hold';
     u.x=1010+(u.id%6)*25;u.y=950+(u.id%3)*24;}
   offensiveTarget=null;game.offensiveTarget=null;fieldEnemies=[];game.fieldEnemies=[];
   renderer.centerCamera();toast('🏳️ 원정군 퇴각');
 }else return;
 saveSoon();
}
function openWar(){
 if(ui.panel.open||ui.fishing.open)return;
 ui.panelTitle.textContent='⚔️ 전쟁 지도 · 적 영주';
 renderWar();ui.panel.showModal();
}
function renderWar(){
 const lords=getEnemyLords();
 const army=allies.filter(u=>u.hp>0);
 ui.panelBody.innerHTML='<p class="panel-note">수비대를 모집하고 집결/방어/공격/후퇴를 지정해. 적 성벽을 돌파하고 마을회관을 파괴하면 영주가 패배한다.</p>'+
 '<div class="realm-war-orders"><button data-army-order="rally">🚩 집결</button><button data-army-order="hold">🛡️ 방어</button><button data-army-order="attack">⚔️ 공격</button><button data-army-order="retreat">🏳️ 퇴각</button></div>'+
 '<div class="realm-enemy-grid">'+lords.map(l=>'<article class="realm-lord">'+
 '<h3>🏰 '+l.name+(l.defeated?' · 점령':state.strongholdDiplomacy?.[l.id]==='ally'?' · 동맹':'')+'</h3><p>📍 '+l.region+'</p>'+
 '<p>🏛️ 성채 '+Math.ceil(l.hp)+'/'+l.maxHp+' · 🧱 성벽 '+Math.ceil(l.wallHp)+' · ⚔️ 주둔 '+l.troops+'</p>'+
 '<button class="realm-main-command" type="button" data-lord="'+l.id+'" '+(l.defeated||state.strongholdDiplomacy?.[l.id]==='ally'||!state.barracksBuilt||army.length<1||offensiveTarget?'disabled':'')+'>'+(l.defeated?'✅ 점령 완료':offensiveTarget===''+l.id?'공성 진행 중':'⚔️ 출병 명령')+'</button>'+
 '<button class="realm-look" type="button" data-look="'+l.id+'">🗺️ 적 성 보기</button></article>').join('')+'</div>'+
 '<button class="realm-main-command" type="button" data-home>🏰 내 성으로 돌아가기</button>'+
 '<p class="panel-note">현재 군대 '+army.length+'명 · 병영 건설과 식량 생산이 전쟁 준비의 핵심</p>';
 ui.panelBody.querySelectorAll('[data-army-order]').forEach(b=>b.addEventListener('click',()=>{
   issueArmyOrder(b.dataset.armyOrder);ui.panel.close();
 }));
 ui.panelBody.querySelectorAll('[data-lord]').forEach(b=>b.addEventListener('click',()=>{
   const lord=lords.find(l=>l.id===b.dataset.lord);
   if(!lord||state.strongholdDiplomacy?.[lord.id]==='ally'||!state.barracksBuilt||!army.length||offensiveTarget)return;
   offensiveTarget=lord.id;game.offensiveTarget=lord.id;
   fieldEnemies=Array.from({length:Math.min(5,Math.max(2,Math.ceil(lord.troops/5)))},(_,i)=>{
     const u=createUnit(i%2?'archer':'soldier',true);
     u.x=lord.x-130+i*22;u.y=lord.y-90+(i%3)*35;u.hp=u.maxHp=40+10*(lord.focus==='defense');
     u.attack=6;u.range=i%2?170:60;return u;
   });
   game.fieldEnemies=fieldEnemies;
   for(const u of army)u._expedition=true;
   ui.panel.close();
   renderer.viewFocus={x:lord.x-450,y:lord.y};renderer.viewZoom=.65;
   window.dispatchEvent(new CustomEvent('cozy:war-event',{detail:{type:'battle',title:lord.name+' 공성전 출격'}}));
   toast('🚩 '+lord.name+' 성채로 부대 출병!');
 }));
 ui.panelBody.querySelectorAll('[data-look]').forEach(b=>b.addEventListener('click',()=>{
   const lord=lords.find(l=>l.id===b.dataset.look);
   if(lord){renderer.viewFocus={x:lord.x,y:lord.y};renderer.viewZoom=.65;ui.panel.close()}
 }));
 ui.panelBody.querySelector('[data-home]')?.addEventListener('click',()=>{
   renderer.centerCamera();ui.panel.close();
 });
}
function updateOffensive(dt){
 if(!offensiveTarget)return;
 const lord=getEnemyLords().find(l=>l.id===offensiveTarget);if(!lord||lord.defeated)return;
 const fighters=allies.filter(u=>u.hp>0&&u._expedition);
 if(!fighters.length){toast('⚔️ 원정군 전멸 · 재모집 필요');offensiveTarget=null;game.offensiveTarget=null;fieldEnemies=[];return}
 for(const enemy of fieldEnemies.filter(u=>u.hp>0)){
   const t=nearestLiving(enemy,fighters);if(!t)continue;
   const distance=Math.hypot(enemy.x-t.x,enemy.y-t.y);
   if(distance<enemy.range){enemy.cool-=dt;if(enemy.cool<=0){t.hp-=enemy.attack;enemy.cool=1.25}}
 }
 for(const unit of fighters){
   if(unit.hp<=0)continue;
   const defender=nearestLiving(unit,fieldEnemies);
   const distDef=defender?Math.hypot(unit.x-defender.x,unit.y-defender.y):Infinity;
   if(defender&&distDef<330){
     if(distDef>unit.range)moveToward(unit,defender.x,defender.y,dt);
     else{unit.cool-=dt;if(unit.cool<=0){defender.hp-=unit.attack;unit.cool=unit.rate||.85}}
     continue;
   }
   const dst=Math.hypot(unit.x-lord.x,unit.y-lord.y),reach=unit.range>220?unit.range:unit.kind==='archer'?230:95;
   if(dst>reach)moveToward(unit,lord.x,lord.y,dt);
   else{
     unit.cool-=dt;
     if(unit.cool<=0){
       const wallHit=lord.wallHp>0;
       const amount=wallHit&&unit.siegeDamage?unit.siegeDamage:unit.attack*(unit.kind==='archer'?.85:1);
       if(unit.kind!=='trebuchet'||unit.ammo>0){
         if(wallHit)lord.wallHp=Math.max(0,lord.wallHp-amount);
         else lord.hp=Math.max(0,lord.hp-amount);
         if(unit.kind==='trebuchet')unit.ammo--;
       }
       unit.cool=unit.rate||.75;
     }
   }
 }
 allies=allies.filter(u=>u.hp>0);fieldEnemies=fieldEnemies.filter(u=>u.hp>0);game.fieldEnemies=fieldEnemies;game.allies=allies;
 if(lord.hp<=0){
   lord.hp=0;lord.defeated=true;offensiveTarget=null;game.offensiveTarget=null;fieldEnemies=[];
   for(const u of allies)delete u._expedition;
   state.coins+=120;state.inventory.wood+=20;state.inventory.stone+=16;saveSoon();
   const remaining=getEnemyLords().filter(l=>!l.defeated);
   window.dispatchEvent(new CustomEvent('cozy:war-event',{detail:{type:'victory',title:lord.name+' 함락'}}));
   if(!remaining.length)showGameResult('🏆 승리 · 모든 적 영주 격파','모든 적 마을회관을 파괴하고 왕국을 통일했어.');
   else toast('🏰 '+lord.name+' 마을회관 파괴! 적 영주 패배 · 영지 점령');
 }
}

function updateRaid(dt){
  const fort=getFort();
  if(!raidActive){
    // 임의 주기 습격을 중단하고 적 영주의 군사력과 공격 판단을 사용한다.
    const attacker=advanceEnemyLords(dt);
    if(attacker){startRaid(attacker);return;}
    /*state.raidTimer+=dt;
    const remaining=raidInterval()-state.raidTimer;
    if(remaining>30)raidWarningShown=false;
    if(!raidWarningShown&&remaining<=30&&remaining>0&&!fort?.siegeRequested){
      raidWarningShown=true;toast('🔔 정찰대 경보! 30초 뒤 습격이 시작돼');
    }
    if(fort?.siegeRequested || state.raidTimer>=raidInterval())startRaid();*/
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
    state.keepDestroyed=true;
    game.keepDestroyed=true;showGameResult('패배 · 마을회관 함락','적군이 성채를 점령했어. 세이브를 새로 시작해야 해.');
    window.dispatchEvent(new CustomEvent('cozy:war-event',{detail:{type:'defeat',title:'우리 성채 함락'}}));
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
function startRaid(attacker=null){
  const fort=getFort(),auto=fort?.siegeAuto||'off';
  const siegeEnabled=!!fort?.siegeRequested||(!!fort&&fort.siegeAuto==='always')||
    (!!fort&&auto==='third'&&state.raidNumber===2);
  if(fort)fort.siegeRequested=false;
  state.raidTimer=0;raidWarningShown=false;state.raidNumber=(state.raidNumber%3)+1;
  raidActive=true;game.raidActive=true;selectedWolfId=null;enemies=[];
  // 적 영주 출병: 해당 영주의 인구와 생산량으로 병력을 편성한다.
  if(attacker){
    const size=Math.min(18,Math.max(3,Math.floor(attacker.troops)));
    for(let i=0;i<size;i++){const u=createUnit(i%4===0?'archer':'soldier',true);
      u.x=attacker.x+(i%5)*28;u.y=attacker.y+(i%4)*24;
      u.speed=Math.max(u.speed,165); // 적 영주 성에서 실제 진군
    u._lordRaid=true;u._siegeLane=u.y<520?440:u.y>730?800:610;
    u.siegeDamage=12+(attacker.focus==='rush'?8:0);u.siegeCooldown=1.4;
    enemies.push(u)}
    attacker.troops=Math.max(0,attacker.troops-size);attacker.food=Math.max(0,attacker.food-size*2);
    toast('⚔️ '+attacker.name+' 군세 출병! 성문과 마을회관을 방어해');
     window.dispatchEvent(new CustomEvent('cozy:war-event',{detail:{type:'attack',title:attacker.name+' 침공'}}));
  } else if(state.raidNumber===1)for(let i=0;i<3;i++)enemies.push(createUnit('soldier',true));
  else if(state.raidNumber===2){
    for(let i=0;i<3;i++)enemies.push(createUnit('soldier',true));
    for(let i=0;i<2;i++)enemies.push(createUnit('archer',true));
  }else enemies.push(createUnit('soldier',true,true));
  if(!attacker&&siegeEnabled && fort?.wallTier && state.villageDevelopment?.townHallBuilt){
    grandSiege={wave:0,elapsed:0,nextWaveAt:.6,spawned:0};
    game.grandSiege=grandSiege;
    toast('🚩 대공성전 개시! 성문과 성벽을 방어해');
  }else{
    grandSiege=null;game.grandSiege=null;
    if(!attacker)toast(state.raidNumber===3?'👹 보스 습격!':`⚠️ ${state.raidNumber}차 습격!`);
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
  if(hostile&&(u._grandSiege||u._lordRaid)){
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
    if(u._lordRaid||SIEGE_MACHINES.has(u.kind)||u.kind==='ladder'||u._fortClimbed){
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
    t.hp-=u.attack*bonus;u.cool=u.rate||.85
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

function updatePeaceAllies(dt){if(raidActive)return;const wolf=wolves.find(w=>w.id===selectedWolfId&&w.alive);for(const u of allies){if(u._fortPost){u.x=u._fortPost.x;u.y=u._fortPost.y;continue}if(['ram','trebuchet','siegeTower'].includes(u.kind))continue;if(wolf&&u.kind==='soldier')continue;u.wander-=dt;if(u.wander<=0){const a=Math.random()*Math.PI*2;u.vx=Math.cos(a);u.vy=Math.sin(a);u.wander=1.2+Math.random()*2.2}const nx=u.x+u.vx*u.speed*.28*dt,ny=u.y+u.vy*u.speed*.28*dt;if(nx>350&&nx<1280)u.x=nx;else u.vx*=-1;if(ny>450&&ny<900)u.y=ny;else u.vy*=-1}}
function advanceClock(dt){clockCarry+=dt;if(clockCarry<.5)return;const ticks=Math.floor(clockCarry/.5);clockCarry-=ticks*.5;state.minutes+=ticks*5;state.playMinutes+=ticks*2.5/60;while(state.minutes>=1440){state.minutes-=1440;state.day++;state.weather=seededWeather(state.day);game.weather=state.weather;toast(`${state.day}일차 · ${state.weather}`)}updateHUD();saveSoon()}
function seededWeather(day){return Math.abs(Math.sin(day*91.731)*10000)%1<.28?'비':'맑음'}
function updateHUD(){
  const h=Math.floor(state.minutes/60),m=Math.floor(state.minutes%60),pm=h>=12,h12=((h+11)%12)+1;
  ui.day.textContent=`${state.day}일차`;
  ui.time.textContent=`${pm?'오후':'오전'} ${h12}:${String(m).padStart(2,'0')}`;
  ui.weather.textContent=state.weather==='비'?'🌧️ 비':'☀️ 맑음';
  ui.coins.textContent=String(state.coins);
  if(ui.economy)ui.economy.textContent=`🪵 ${Math.floor(state.inventory.wood)} · 🪨 ${Math.floor(state.inventory.stone)} · 🍖 ${Math.floor(state.inventory.food)} · 👷 ${economyStaff(state).assigned} · ⚔️ ${allies.length}`;
  if(raidActive)ui.raid.textContent=grandSiege?
    `🏰 ${grandSiege.wave}/6차 · 적 ${enemies.length} · 성채 ${Math.ceil(getFort()?.keepHp??900)} · 사기 ${getFort()?.morale??65}`:
    `⚔️ 습격 ${state.raidNumber} · 적 ${enemies.length}`;
  else{
    const living=getEnemyLords().filter(l=>!l.defeated);
    ui.raid.textContent=living.length?'🏰 적 영주 '+living.length+'명 · '+(game.offensiveTarget?'공성 중':'영지 방어'):'🏆 왕국 통일';
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
  ui.hint.textContent=raidActive?'공성전 진행 · 병영과 성채에서 전술 명령':'건물 터치: 강화 · 드래그: 이동 · 두 손가락: 확대';
}
function frame(now){const dt=Math.min(.05,Math.max(0,(now-lastFrame)/1000));lastFrame=now;game.timeNow=Date.now();if(!runtime.paused&&!ui.panel.open&&!ui.fishing.open&&!state.keepDestroyed){updateCameraControl(dt);advanceClock(dt);updateRaid(dt);updateOffensive(dt);if(!raidActive&&!game.offensiveTarget){updatePeaceAllies(dt)}}game.allies=allies;game.enemies=enemies;game.raidActive=raidActive;game.selectedWolfId=selectedWolfId;updateHUD();updateHint();renderer.draw(game);requestAnimationFrame(frame)}

allies=state.army.map(x=>createUnit(x.kind,false));game.allies=allies;
getEnemyLords();
window.cozyRTS={
 state,getLords:getEnemyLords,unitTypes:RTS_UNIT_TYPES,save:()=>{saveSoon();runtime.flushSaveProgress(state)},
 diplomacy(id,mode){
   const lord=getEnemyLords().find(l=>l.id===id);
   if(!lord||lord.defeated||!['ally','hostile'].includes(mode))return false;
   state.strongholdDiplomacy=state.strongholdDiplomacy||{};
   if(mode==='ally'&&state.strongholdDiplomacy[id]!=='ally'){
     if(state.coins<80){toast('동맹에는 금화 80 필요');return false}
     state.coins-=80;
   }
   state.strongholdDiplomacy[id]=mode;saveSoon();updateHUD();return true;
 },
 center(x,y){game.siegeOverview=true;renderer.viewFocus={x,y};renderer.viewZoom=.63}
};
if(state.keepDestroyed)showGameResult('패배 · 마을회관 함락','영주가 쓰러지고 성채가 무너졌어. 새 전쟁을 시작할 수 있어.');
else if(getEnemyLords().every(l=>l.defeated))showGameResult('🏆 승리 · 왕국 통일','모든 적 영주의 마을회관을 파괴했어.');
updateHUD();requestAnimationFrame(frame);
