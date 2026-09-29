import { JaewoonVibeRuntime } from '../../assets/vibe-runtime.js';
import { IslandRendererV3 } from './render-v3.js';

const GAME_ID='cozy-island';
const RAID_INTERVAL=120;
const FARM_GROW_MS=20000;
const WORKER_PRICE=50, WORKER_MAX=3, WORK_TICK=10, DELIVERY_INTERVAL=60, FEED_INTERVAL=180, FEED_COST=10;
const SOLDIER_MAX=5, ARCHER_MAX=3;
const TOOLS=[
  {id:'hand',label:'손',icon:'🤲'},
  {id:'rod',label:'낚싯대',icon:'🎣'},
  {id:'seed',label:'씨앗',icon:'🌱'},
  {id:'water',label:'물뿌리개',icon:'💧'}
];
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
let selectedTool=0,lastFrame=performance.now(),clockCarry=0,toastTimer=0,fishing=null,fishingFrame=0,unitId=1,raidActive=false;
let allies=[],enemies=[],selectedWolfId=null,lastTap={time:0,x:0,y:0};
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
const game={world,state,player,nodes,npcs,barracks,workerShop,allies,enemies,wolves,weather:state.weather,timeNow:Date.now(),raidActive,selectedWolfId};
const ui={
  day:qs('#dayText'),time:qs('#timeText'),weather:qs('#weatherText'),coins:qs('#coinText'),raid:qs('#raidText'),hint:qs('#hint'),toast:qs('#toast'),tool:qs('#toolButton'),action:qs('#actionButton'),inventory:qs('#inventoryButton'),panel:qs('#panel'),panelTitle:qs('#panelTitle'),panelBody:qs('#panelBody'),panelClose:qs('#panelClose'),fishing:qs('#fishing'),fishMarker:qs('#fishMarker'),catch:qs('#catchButton'),cancelFishing:qs('#cancelFishing')
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
  Space:{down:e=>{e.preventDefault();interact()}},KeyE:{down:cycleTool}
});
runtime.bindTouchButton(ui.action,interact);runtime.bindTouchButton(ui.tool,cycleTool);runtime.bindTouchButton(ui.inventory,openInventory);runtime.bindTouchButton(ui.panelClose,()=>ui.panel.close());runtime.bindTouchButton(ui.catch,catchFish);runtime.bindTouchButton(ui.cancelFishing,stopFishing);
window.addEventListener('resize',()=>renderer.resize());window.addEventListener('jaewoon:pause',e=>{if(e.detail.paused)pressed.clear()});
canvas.addEventListener('dblclick',e=>commandWolfAt(e.clientX,e.clientY));
canvas.addEventListener('pointerup',e=>{const now=performance.now();if(now-lastTap.time<360&&Math.hypot(e.clientX-lastTap.x,e.clientY-lastTap.y)<38)commandWolfAt(e.clientX,e.clientY);lastTap={time:now,x:e.clientX,y:e.clientY}});

function cycleTool(){if(ui.panel.open||ui.fishing.open)return;selectedTool=(selectedTool+1)%TOOLS.length;updateToolUI();toast(`${TOOLS[selectedTool].icon} ${TOOLS[selectedTool].label}`)}
function updateToolUI(){const t=TOOLS[selectedTool];ui.tool.innerHTML=`${t.icon}<small>${t.label}</small>`}
function openInventory(){if(ui.fishing.open)return;ui.panelTitle.textContent='가방';const i=state.inventory;ui.panelBody.innerHTML=`<div class="inventory-grid">${itemCard('🪵 나무',i.wood)}${itemCard('🪨 돌',i.stone)}${itemCard('🍖 식량',i.food)}${itemCard('🌼 꽃',i.flower)}${itemCard('🐟 물고기',i.fish)}${itemCard('🥕 농작물',i.crop)}${itemCard('🌱 씨앗',i.seeds)}</div><p class="panel-note">노비 ${state.workers}/${WORKER_MAX} · 병사 ${countKind('soldier')}/${SOLDIER_MAX} · 궁수 ${countKind('archer')}/${ARCHER_MAX}</p>`;ui.panel.showModal()}
function countKind(kind){return allies.filter(u=>u.kind===kind&&u.hp>0).length}

function nearestInteraction(){const c=[];for(const n of nodes){if(n.lockedByExpansion&&!state.expanded)continue;c.push({type:'node',item:n,d:dist(n.x,n.y)})}npcs.forEach(n=>c.push({type:'npc',item:n,d:dist(n.x,n.y)}));state.plots.forEach((p,i)=>{const x=959+(i%3)*78,y=404+Math.floor(i/3)*78;c.push({type:'plot',item:{plot:p,index:i},d:dist(x,y)})});c.push({type:'house',d:dist(765,350)},{type:'ship',d:dist(775,760)},{type:'fish',d:dist(520,430)},{type:'barracks',d:dist(barracks.x,barracks.y)},{type:'workerShop',d:dist(workerShop.x,workerShop.y)});if(!state.expanded)c.push({type:'expand',d:dist(1325,600)});c.sort((a,b)=>a.d-b.d);return c[0]?.d<=86?c[0]:null}
function interactionHint(t){if(!t)return raidActive?'습격 중! 병사들이 마을을 방어 중':'섬을 둘러봐';const tool=TOOLS[selectedTool].id;if(t.type==='node')return t.item.kind==='tree'?'행동: 나무 줍기':t.item.kind==='rock'?'행동: 돌 줍기':'행동: 꽃 꺾기';if(t.type==='npc')return `행동: ${t.item.name}와 이야기`;if(t.type==='house')return'행동: 집 꾸미기';if(t.type==='ship')return'행동: 출하';if(t.type==='barracks')return state.barracksBuilt?'행동: 병사 모집':'행동: 병영 건설 · 나무5 돌3';if(t.type==='workerShop')return`행동: 노비 판매소 · ${state.workers}/${WORKER_MAX}`;if(t.type==='fish')return tool==='rod'?'행동: 낚시':'낚싯대를 선택해';if(t.type==='expand')return'행동: 동쪽 지역 해금 · 120골드';if(t.type==='plot'){const p=t.item.plot;if(p.state==='empty')return tool==='seed'?'행동: 씨앗 심기':'씨앗을 선택해';if(p.ready)return'행동: 수확 · 식량 +10';if(!p.watered)return tool==='water'?'행동: 물 주기':'물뿌리개를 선택해';return'20초 동안 자라는 중'}return'행동'}
function interact(){if(runtime.paused||ui.panel.open||ui.fishing.open)return;const t=nearestInteraction();if(!t){toast('가까이 가서 행동해봐');return}const tool=TOOLS[selectedTool].id;if(t.type==='node')collectNode(t.item);else if(t.type==='npc')talkTo(t.item);else if(t.type==='house')openDecor();else if(t.type==='ship')shipGoods();else if(t.type==='barracks')openBarracks();else if(t.type==='workerShop')openWorkerShop();else if(t.type==='fish')tool==='rod'?startFishing():toast('낚싯대를 선택해');else if(t.type==='expand')expandIsland();else if(t.type==='plot')usePlot(t.item.index,tool)}
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
function shipGoods(){const i=state.inventory,earned=i.fish*12+i.flower*4+i.crop*18;if(!earned){toast('출하할 게 없어');return}i.fish=0;i.flower=0;i.crop=0;state.coins+=earned;saveSoon();updateHUD();toast(`🪙 +${earned}`)}
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

function updateRaid(dt){if(!raidActive){state.raidTimer+=dt;if(state.raidTimer>=RAID_INTERVAL)startRaid();return}updateRaidCombat(dt);if(enemies.length===0){raidActive=false;game.raidActive=false;state.raidTimer=0;saveSoon();toast('✅ 습격 방어 성공')}}
function startRaid(){state.raidTimer=0;state.raidNumber=(state.raidNumber%3)+1;raidActive=true;game.raidActive=true;selectedWolfId=null;enemies=[];if(state.raidNumber===1)for(let i=0;i<3;i++)enemies.push(createUnit('soldier',true));else if(state.raidNumber===2){for(let i=0;i<3;i++)enemies.push(createUnit('soldier',true));for(let i=0;i<2;i++)enemies.push(createUnit('archer',true))}else enemies.push(createUnit('soldier',true,true));game.enemies=enemies;toast(state.raidNumber===3?'👹 보스 습격!':`⚠️ ${state.raidNumber}차 습격!`);saveSoon()}
function updateRaidCombat(dt){for(const u of allies)updateCombatUnit(u,enemies,dt,false);for(const u of enemies)updateCombatUnit(u,allies,dt,true);allies=allies.filter(u=>u.hp>0);enemies=enemies.filter(u=>u.hp>0);game.allies=allies;game.enemies=enemies;saveArmyIfChanged()}
function updateCombatUnit(u,targets,dt,hostile){u.cool=Math.max(0,u.cool-dt);let t=nearestLiving(u,targets);if(!t&&hostile){moveToward(u,barracks.x,barracks.y,dt);return}if(!t)return;const d=Math.hypot(t.x-u.x,t.y-u.y)||1;if(d>u.range)moveToward(u,t.x,t.y,dt);else if(u.cool<=0){t.hp-=u.attack;u.cool=u.kind==='archer'?1.15:.85}}
function nearestLiving(u,arr){let b=null,bd=1e9;for(const t of arr){if(t.hp<=0)continue;const d=Math.hypot(t.x-u.x,t.y-u.y);if(d<bd){bd=d;b=t}}return b}
function moveToward(u,x,y,dt){const dx=x-u.x,dy=y-u.y,d=Math.hypot(dx,dy)||1;u.x+=dx/d*u.speed*dt;u.y+=dy/d*u.speed*dt}
function saveArmyIfChanged(){const alive=allies.filter(u=>u.hp>0);if(alive.length!==state.army.length){state.army=alive.map(u=>({kind:u.kind}));saveSoon()}}

function makeWolf(id,x,y){return{id,x,y,homeX:x,homeY:y,hp:200,maxHp:200,attack:10,speed:68,cool:0,alive:true,respawnAt:0,wander:0,vx:0,vy:0}}
function commandWolfAt(sx,sy){if(!state.expanded||raidActive)return;const p=renderer.screenToWorld(game,sx,sy);let best=null,bd=46;for(const w of wolves){if(!w.alive)continue;const d=Math.hypot(w.x-p.x,w.y-p.y);if(d<bd){best=w;bd=d}}if(!best)return;selectedWolfId=best.id;game.selectedWolfId=best.id;toast(`🐺 늑대 지정! 병사 ${countKind('soldier')}명 출동`)}
function updateWolves(dt){const now=Date.now();for(const w of wolves){if(!w.alive){if(w.respawnAt&&now>=w.respawnAt){w.alive=true;w.hp=w.maxHp;w.x=w.homeX;w.y=w.homeY;w.respawnAt=0}continue}w.cool=Math.max(0,w.cool-dt);if(raidActive||selectedWolfId!==w.id){w.wander-=dt;if(w.wander<=0){const a=Math.random()*Math.PI*2;w.vx=Math.cos(a);w.vy=Math.sin(a);w.wander=1.5+Math.random()*2.5}const nx=w.x+w.vx*w.speed*.2*dt,ny=w.y+w.vy*w.speed*.2*dt;if(nx>1450&&nx<2800)w.x=nx;else w.vx*=-1;if(ny>220&&ny<980)w.y=ny;else w.vy*=-1;continue}
    const soldiers=allies.filter(u=>u.kind==='soldier'&&u.hp>0);for(const s of soldiers){s.cool=Math.max(0,s.cool-dt);const d=Math.hypot(w.x-s.x,w.y-s.y)||1;if(d>s.range)moveToward(s,w.x,w.y,dt);else if(s.cool<=0){w.hp-=s.attack;s.cool=.85}}
    const target=nearestLiving(w,soldiers);if(target){const d=Math.hypot(target.x-w.x,target.y-w.y)||1;if(d>52)moveToward(w,target.x,target.y,dt);else if(w.cool<=0){target.hp-=w.attack;w.cool=.9}}
    if(w.hp<=0){w.alive=false;w.respawnAt=now+60000;selectedWolfId=null;game.selectedWolfId=null;toast('🐺 늑대를 처치했어!')}allies=allies.filter(u=>u.hp>0);game.allies=allies;saveArmyIfChanged()}}

function updatePeaceAllies(dt){if(raidActive)return;const wolf=wolves.find(w=>w.id===selectedWolfId&&w.alive);for(const u of allies){if(wolf&&u.kind==='soldier')continue;u.wander-=dt;if(u.wander<=0){const a=Math.random()*Math.PI*2;u.vx=Math.cos(a);u.vy=Math.sin(a);u.wander=1.2+Math.random()*2.2}const nx=u.x+u.vx*u.speed*.28*dt,ny=u.y+u.vy*u.speed*.28*dt;if(nx>350&&nx<1280)u.x=nx;else u.vx*=-1;if(ny>450&&ny<900)u.y=ny;else u.vy*=-1}}
function advanceClock(dt){clockCarry+=dt;if(clockCarry<.5)return;const ticks=Math.floor(clockCarry/.5);clockCarry-=ticks*.5;state.minutes+=ticks*5;state.playMinutes+=ticks*2.5/60;while(state.minutes>=1440){state.minutes-=1440;state.day++;state.weather=seededWeather(state.day);game.weather=state.weather;toast(`${state.day}일차 · ${state.weather}`)}updateHUD();saveSoon()}
function seededWeather(day){return Math.abs(Math.sin(day*91.731)*10000)%1<.28?'비':'맑음'}
function updateHUD(){const h=Math.floor(state.minutes/60),m=Math.floor(state.minutes%60),pm=h>=12,h12=((h+11)%12)+1;ui.day.textContent=`${state.day}일차`;ui.time.textContent=`${pm?'오후':'오전'} ${h12}:${String(m).padStart(2,'0')}`;ui.weather.textContent=state.weather==='비'?'🌧️ 비':'☀️ 맑음';ui.coins.textContent=String(state.coins);if(raidActive)ui.raid.textContent=`⚔️ 습격 ${state.raidNumber} · 적 ${enemies.length}`;else{const r=Math.max(0,Math.ceil(RAID_INTERVAL-state.raidTimer));ui.raid.textContent=`⏱️ 습격 ${Math.floor(r/60)}:${String(r%60).padStart(2,'0')}`}}
function canMoveTo(x,y){const maxX=state.expanded?2820:1305;if(x<165||x>maxX||y<160||y>1025)return false;const pond=Math.pow((x-390)/150,2)+Math.pow((y-370)/112,2)<1;if(pond)return false;if(x>635&&x<900&&y>170&&y<415)return false;return true}
function updateMovement(dt){let dx=(pressed.has('right')?1:0)-(pressed.has('left')?1:0),dy=(pressed.has('down')?1:0)-(pressed.has('up')?1:0);if(!dx&&!dy)return;const mag=Math.hypot(dx,dy)||1;dx/=mag;dy/=mag;const nx=player.x+dx*player.speed*dt,ny=player.y+dy*player.speed*dt;if(canMoveTo(nx,player.y))player.x=nx;if(canMoveTo(player.x,ny))player.y=ny}
function updateHint(){ui.hint.textContent=interactionHint(nearestInteraction())}
function frame(now){const dt=Math.min(.05,Math.max(0,(now-lastFrame)/1000));lastFrame=now;game.timeNow=Date.now();if(!runtime.paused&&!ui.panel.open&&!ui.fishing.open){updateMovement(dt);advanceClock(dt);updateCrops();updateWorkers(dt);updateRaid(dt);if(!raidActive){updatePeaceAllies(dt);updateWolves(dt)}}game.allies=allies;game.enemies=enemies;game.raidActive=raidActive;game.selectedWolfId=selectedWolfId;updateHUD();updateHint();renderer.draw(game);requestAnimationFrame(frame)}

allies=state.army.map(x=>createUnit(x.kind,false));game.allies=allies;updateToolUI();updateHUD();requestAnimationFrame(frame);
