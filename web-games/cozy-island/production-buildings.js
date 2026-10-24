import { JaewoonVibeRuntime } from '../../assets/vibe-runtime.js';
import { IslandRendererV3 } from './render-v3.js';

const WORKER_MAX = 3;
const PRODUCE_SECONDS = 5;
const DELIVERY_SECONDS = 60;
const FEED_SECONDS = 180;
const FEED_COST = 10;
const LUMBER = { x: 245, y: 850, wood: 3, stone: 1, radius: 108 };
const MINE = { x: 785, y: 965, wood: 2, stone: 3, radius: 108 };
const FARM = { x1: 900, y1: 340, x2: 1180, y2: 555 };

let currentGame = null;
let activeRuntime = null;
let lastTick = performance.now();
let lastTap = { time: 0, x: 0, y: 0 };
let lastHandledAt = 0;

const originalLoadProgress = JaewoonVibeRuntime.prototype.loadProgress;
const originalQueueSaveProgress = JaewoonVibeRuntime.prototype.queueSaveProgress;

function workerNumber(value) {
  if (value && typeof value === 'object') return Math.max(0, Math.floor(Number(value.count) || 0));
  return Math.max(0, Math.floor(Number(value) || 0));
}

function ensureProduction(progress) {
  if (!progress || typeof progress !== 'object') return null;
  const source = progress.productionBuildings && typeof progress.productionBuildings === 'object'
    ? progress.productionBuildings : {};
  const production = {
    lumberBuilt: Boolean(source.lumberBuilt),
    mineBuilt: Boolean(source.mineBuilt),
    // 업그레이드: 기존 건물/자원 저장을 유지하고 레벨만 추가한다.
    lumberLevel: source.lumberBuilt ? Math.max(1,Math.min(3,Math.floor(Number(source.lumberLevel)||1))) : 0,
    mineLevel: source.mineBuilt ? Math.max(1,Math.min(3,Math.floor(Number(source.mineLevel)||1))) : 0,
    lumberWorker: source.lumberWorker ? 1 : 0,
    mineWorker: source.mineWorker ? 1 : 0,
    lumberTimer: Math.max(0, Number(source.lumberTimer) || 0),
    mineTimer: Math.max(0, Number(source.mineTimer) || 0),
    playerLumberTimer: Math.max(0, Number(source.playerLumberTimer) || 0),
    playerMineTimer: Math.max(0, Number(source.playerMineTimer) || 0),
    deliveryTimer: Math.max(0, Number(source.deliveryTimer) || 0),
    assignedFeedTimer: Math.max(0, Number(source.assignedFeedTimer) || 0),
    bufferWood: Math.max(0, Math.floor(Number(source.bufferWood) || 0)),
    bufferStone: Math.max(0, Math.floor(Number(source.bufferStone) || 0)),
    legacyMigrated: Boolean(source.legacyMigrated)
  };
  progress.productionBuildings = production;

  const assigned = production.lumberWorker + production.mineWorker;
  let total = progress.workerTotal == null
    ? workerNumber(progress.workers) + assigned
    : Math.floor(Number(progress.workerTotal) || 0);
  total = Math.max(assigned, Math.min(WORKER_MAX, total));
  progress.workerTotal = total;

  if (!production.legacyMigrated) {
    const oldStorage = progress.workerStorage;
    if (oldStorage && progress.inventory) {
      progress.inventory.wood = (Number(progress.inventory.wood) || 0) + Math.max(0, Math.floor(Number(oldStorage.wood) || 0));
      progress.inventory.stone = (Number(progress.inventory.stone) || 0) + Math.max(0, Math.floor(Number(oldStorage.stone) || 0));
      oldStorage.wood = 0;
      oldStorage.stone = 0;
    }
    production.legacyMigrated = true;
  }
  return production;
}

function reconcileWorkers(progress) {
  const production = ensureProduction(progress);
  if (!production) return;
  let farm = workerNumber(progress.workers);
  let assigned = production.lumberWorker + production.mineWorker;
  if (assigned > WORKER_MAX) {
    production.mineWorker = 0;
    assigned = production.lumberWorker;
  }
  if (farm + assigned > WORKER_MAX) {
    farm = Math.max(0, WORKER_MAX - assigned);
    progress.workers = farm;
  }
  progress.workerTotal = Math.min(WORKER_MAX, farm + assigned);
}

JaewoonVibeRuntime.prototype.loadProgress = function loadProgressWithProduction(fallback = {}) {
  const progress = originalLoadProgress.call(this, fallback);
  activeRuntime = this;
  ensureProduction(progress);
  return progress;
};

JaewoonVibeRuntime.prototype.queueSaveProgress = function saveProgressWithProduction(progress, delay) {
  activeRuntime = this;
  reconcileWorkers(progress);
  return originalQueueSaveProgress.call(this, progress, delay);
};

function toast(message) {
  const el = document.querySelector('#toast');
  if (!el) return;
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove('show'), 2100);
}

function saveState(state) {
  reconcileWorkers(state);
  activeRuntime?.queueSaveProgress(state);
}

function totalWorkers(state) {
  const p = ensureProduction(state);
  return Math.min(WORKER_MAX, workerNumber(state.workers) + (p?.lumberWorker || 0) + (p?.mineWorker || 0));
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function setupBuildButton() {
  if (document.querySelector('#productionBuildButton')) return;
  const button = document.createElement('button');
  button.id = 'productionBuildButton';
  button.type = 'button';
  button.style.cssText = 'position:absolute;left:50%;bottom:205px;transform:translateX(-50%);z-index:9;border:0;border-radius:14px;padding:10px 14px;background:rgba(255,255,255,.95);box-shadow:0 4px 14px rgba(31,69,57,.22);font-weight:900;color:#25423a;display:none;touch-action:manipulation;';
  button.addEventListener('click', () => {
    if (!currentGame) return;
    const kind = button.dataset.kind;
    if (kind === 'lumber') buildLumberyard();
    else if (kind === 'mine') buildMine();
  });
  document.querySelector('#app')?.appendChild(button);
}

function updateBuildButton() {
  const button = document.querySelector('#productionBuildButton');
  if (!button || !currentGame) return;
  const state = currentGame.state;
  const p = ensureProduction(state);
  const player = currentGame.player;
  let kind = '';
  if (!p.lumberBuilt && distance(player, LUMBER) <= LUMBER.radius) kind = 'lumber';
  else if (!p.mineBuilt && distance(player, MINE) <= MINE.radius) kind = 'mine';

  if (!kind) {
    button.style.display = 'none';
    button.dataset.kind = '';
    return;
  }
  button.dataset.kind = kind;
  button.style.display = 'block';
  button.textContent = kind === 'lumber'
    ? '🪓 벌목장 건설 · 나무3 돌1'
    : '⛏️ 광산 건설 · 나무2 돌3';
}

export function buildLumberyard() {
  const state = currentGame?.state;
  if (!state) return;
  const p = ensureProduction(state);
  if (p.lumberBuilt) return;
  if ((Number(state.inventory.wood) || 0) < LUMBER.wood || (Number(state.inventory.stone) || 0) < LUMBER.stone) {
    toast('벌목장 재료 부족 · 나무3 돌1');
    return;
  }
  state.inventory.wood -= LUMBER.wood;
  state.inventory.stone -= LUMBER.stone;
  p.lumberBuilt = true;
  p.lumberLevel = 1;
  saveState(state);
  updateBuildButton();
  toast('🪓 벌목장 완성 · 더블탭하면 노비 배치');
}

export function buildMine() {
  const state = currentGame?.state;
  if (!state) return;
  const p = ensureProduction(state);
  if (p.mineBuilt) return;
  if ((Number(state.inventory.wood) || 0) < MINE.wood || (Number(state.inventory.stone) || 0) < MINE.stone) {
    toast('광산 재료 부족 · 나무2 돌3');
    return;
  }
  state.inventory.wood -= MINE.wood;
  state.inventory.stone -= MINE.stone;
  p.mineBuilt = true;
  p.mineLevel = 1;
  saveState(state);
  updateBuildButton();
  toast('⛏️ 광산 완성 · 더블탭하면 노비 배치');
}

// 생산 건물 강화: 기존 5초 주기와 주민 배치는 그대로, 단계별 산출량만 증가한다.
export function upgradeProduction(kind) {
  const state=currentGame?.state;
  if(!state || !['lumber','mine'].includes(kind))return;
  const p=ensureProduction(state);
  const built=kind==='lumber'?p.lumberBuilt:p.mineBuilt;
  const levelKey=kind==='lumber'?'lumberLevel':'mineLevel';
  if(!built)return toast('건물을 먼저 건설해');
  const tier=p[levelKey];
  if(tier>=3)return toast('이미 최대 3단계야');
  const wood=4+tier*4,stone=3+tier*4;
  if((Number(state.inventory.wood)||0)<wood||(Number(state.inventory.stone)||0)<stone)
    return toast('강화 재료 부족 · 나무 '+wood+' 돌 '+stone);
  state.inventory.wood-=wood;state.inventory.stone-=stone;
  p[levelKey]=tier+1;
  saveState(state);
  toast((kind==='lumber'?'벌목장':'광산')+' '+p[levelKey]+'단계 · 생산량 증가');
}
export function assignWorker(kind) {
  if (!currentGame) return;
  const state = currentGame.state;
  const p = ensureProduction(state);
  const workerKey = kind === 'lumber' ? 'lumberWorker' : 'mineWorker';
  const builtKey = kind === 'lumber' ? 'lumberBuilt' : 'mineBuilt';
  if (!p[builtKey]) return;
  if (p[workerKey]) {
    toast(kind === 'lumber' ? '🧑‍🌾 벌목장에서 이미 작업 중이야' : '🧑‍🌾 광산에서 이미 작업 중이야');
    return;
  }
  if (workerNumber(state.workers) <= 0) {
    toast('농사 중인 노비가 없어 · 대신 근처에 서 있으면 5초마다 직접 생산해');
    return;
  }
  state.workers = workerNumber(state.workers) - 1;
  p[workerKey] = 1;
  p[kind === 'lumber' ? 'lumberTimer' : 'mineTimer'] = 0;
  saveState(state);
  toast(kind === 'lumber' ? '🪓 노비 1명을 벌목장에 배치했어' : '⛏️ 노비 1명을 광산에 배치했어');
}

export function returnWorkerToFarm() {
  if (!currentGame) return;
  const state = currentGame.state;
  const p = ensureProduction(state);
  let from = '';
  if (p.lumberWorker) {
    p.lumberWorker = 0;
    from = '벌목장';
  } else if (p.mineWorker) {
    p.mineWorker = 0;
    from = '광산';
  }
  if (!from) {
    toast('모든 노비가 이미 농사일 중이야');
    return;
  }
  state.workers = Math.min(WORKER_MAX, workerNumber(state.workers) + 1);
  saveState(state);
  toast(`🧑‍🌾 ${from} 노비가 농사일로 돌아왔어`);
}

function screenToWorld(sx, sy) {
  if (!currentGame) return null;
  return currentGame.screenToWorld?.(sx,sy) || null;
}

function handleWorldDouble(sx, sy) {
  if (!currentGame) return;
  const now = performance.now();
  if (now - lastHandledAt < 260) return;
  const point = screenToWorld(sx, sy);
  if (!point) return;
  const p = ensureProduction(currentGame.state);

  if (p.lumberBuilt && Math.hypot(point.x - LUMBER.x, point.y - LUMBER.y) <= 65) {
    lastHandledAt = now;
    assignWorker('lumber');
    return;
  }
  if (p.mineBuilt && Math.hypot(point.x - MINE.x, point.y - MINE.y) <= 65) {
    lastHandledAt = now;
    assignWorker('mine');
    return;
  }
  if (point.x >= FARM.x1 && point.x <= FARM.x2 && point.y >= FARM.y1 && point.y <= FARM.y2) {
    lastHandledAt = now;
    returnWorkerToFarm();
  }
}

const canvas = document.querySelector('#game');
canvas?.addEventListener('dblclick', event => handleWorldDouble(event.clientX, event.clientY));
canvas?.addEventListener('pointerup', event => {
  const now = performance.now();
  if (now - lastTap.time < 360 && Math.hypot(event.clientX - lastTap.x, event.clientY - lastTap.y) < 38) {
    handleWorldDouble(event.clientX, event.clientY);
  }
  lastTap = { time: now, x: event.clientX, y: event.clientY };
});

function feedAssignedWorkers(state, p) {
  let dead = 0;
  for (const key of ['lumberWorker', 'mineWorker']) {
    if (!p[key]) continue;
    if ((Number(state.inventory.food) || 0) >= FEED_COST) {
      state.inventory.food -= FEED_COST;
    } else {
      p[key] = 0;
      dead++;
    }
  }
  saveState(state);
  if (dead > 0) toast(`⚠️ 식량 부족으로 작업장 노비 ${dead}명이 굶어 죽었어`);
}


// 중세 도시 경제: 건물 건설 즉시 일꾼이 자동 배치되고, 생산 체인이 주기적으로 순환한다.
// 최초 무료 벌목장·채석장·곡물창고·마을회관은 수동 자원 채집 없이 시작하기 위한 영지 기반시설.
// 기존 progress.inventory/productionBuildings/workerTotal 저장 키는 삭제하지 않는다.
export const ECONOMY_BUILDINGS=Object.freeze([
 {id:'lumber',name:'벌목장',icon:'🪓',group:'industry',wood:0,stone:0,gold:0,jobs:1,out:'wood',amount:4,desc:'나무를 자동으로 베어 창고에 보관',max:6,x:250,y:830},
 {id:'quarry',name:'채석장',icon:'🪨',group:'industry',wood:2,stone:0,gold:0,jobs:2,out:'stone',amount:3,desc:'돌을 채굴하고 자동 운반',max:6,x:785,y:970},
 {id:'iron',name:'철 광산',icon:'⛏️',group:'industry',wood:8,stone:5,gold:18,jobs:2,out:'iron',amount:2,desc:'대장간·무기고용 철 생산',max:4,x:1460,y:780},
 {id:'stockpile',name:'자재 창고',icon:'📦',group:'industry',wood:5,stone:3,gold:0,jobs:0,out:null,amount:0,desc:'생산품을 보관하는 물자 집결지',max:3,x:670,y:920},
 {id:'wheat',name:'밀 농장',icon:'🌾',group:'food',wood:4,stone:0,gold:0,jobs:1,out:'wheat',amount:4,desc:'제분소에 공급할 밀 자동 수확',max:6,x:1160,y:400},
 {id:'mill',name:'제분소',icon:'⚙️',group:'food',wood:6,stone:3,gold:0,jobs:2,input:'wheat',need:3,out:'flour',amount:3,desc:'밀 3 → 밀가루 3',max:4,x:1260,y:520},
 {id:'bakery',name:'제빵소',icon:'🍞',group:'food',wood:6,stone:2,gold:0,jobs:1,input:'flour',need:2,out:'food',amount:9,desc:'밀가루 2 → 식량 9',max:5,x:1110,y:930},
 {id:'orchard',name:'사과 과수원',icon:'🍎',group:'food',wood:3,stone:0,gold:0,jobs:1,out:'food',amount:4,desc:'과일 재배로 식량 자동 공급',max:6,x:460,y:480},
 {id:'dairy',name:'낙농장',icon:'🧀',group:'food',wood:5,stone:0,gold:0,jobs:1,out:'food',amount:5,desc:'소·치즈 생산으로 식량 확보',max:4,x:470,y:1030},
 {id:'granary',name:'식량 창고',icon:'🏠',group:'food',wood:4,stone:0,gold:0,jobs:0,out:null,amount:0,desc:'농장 생산 식량을 보관',max:3,x:860,y:470},
 {id:'vineyard',name:'포도밭',icon:'🍇',group:'wine',wood:5,stone:0,gold:0,jobs:1,out:'grapes',amount:4,desc:'양조장에 공급할 포도 수확',max:6,x:1430,y:340},
 {id:'winery',name:'포도주 양조장',icon:'🍷',group:'wine',wood:8,stone:5,gold:0,jobs:2,input:'grapes',need:3,out:'wine',amount:3,desc:'포도 3 → 포도주 3',max:4,x:1530,y:570},
 {id:'hops',name:'홉 농장',icon:'🌿',group:'wine',wood:4,stone:0,gold:0,jobs:1,out:'hops',amount:3,desc:'맥주용 홉 재배',max:5,x:1610,y:310},
 {id:'brewery',name:'맥주 양조장',icon:'🍺',group:'wine',wood:7,stone:4,gold:0,jobs:2,input:'hops',need:2,out:'ale',amount:3,desc:'홉 2 → 맥주 3',max:4,x:1720,y:600},
 {id:'tavern',name:'선술집',icon:'🍻',group:'wine',wood:9,stone:5,gold:12,jobs:1,input:'wine',need:1,out:'coins',amount:8,desc:'포도주 판매로 금화 8 획득',max:3,x:990,y:750},
 {id:'hovel',name:'주민 오두막',icon:'🏘️',group:'town',wood:5,stone:0,gold:0,jobs:0,out:null,amount:0,desc:'건물당 자동 일꾼 +4명',max:8,x:610,y:340},
 {id:'well',name:'우물',icon:'🪣',group:'town',wood:3,stone:4,gold:0,jobs:0,out:null,amount:0,desc:'마을의 식수 공급',max:4,x:350,y:580},
 {id:'market',name:'시장',icon:'⚖️',group:'town',wood:7,stone:2,gold:0,jobs:0,out:null,amount:0,desc:'상품 매입과 판매',max:2,x:900,y:830},
 {id:'fletcher',name:'활 제작소',icon:'🏹',group:'military',wood:8,stone:3,gold:0,jobs:1,input:'wood',need:3,out:'bows',amount:2,desc:'나무 3 → 활 2',max:4,x:1310,y:945},
 {id:'smith',name:'대장간',icon:'⚒️',group:'military',wood:9,stone:7,gold:10,jobs:2,input:'iron',need:2,out:'swords',amount:2,desc:'철 2 → 검 2',max:3,x:1190,y:1110},
 {id:'armory',name:'무기고',icon:'🛡️',group:'military',wood:8,stone:8,gold:0,jobs:0,out:null,amount:0,desc:'무장 창고와 병력 보급',max:2,x:700,y:1120},
 {id:'knightHall',name:'기사단 회관',icon:'⚜️',group:'military',wood:15,stone:12,gold:36,jobs:0,out:null,amount:0,desc:'랜덤 기사 후보 영입·스킬 육성',max:1,x:990,y:395},
 {id:'prison',name:'감옥',icon:'🔒',group:'military',wood:12,stone:15,gold:18,jobs:0,out:null,amount:0,desc:'포로 억류·교환·몸값 협상, 기본 4명 수용',max:1,x:1100,y:500}
]);
const ECONOMY_BY_ID=new Map(ECONOMY_BUILDINGS.map(def=>[def.id,def]));
// 개발 트리: 생산 시설의 실물 건설과 강화로 고급 병과·공성·함정을 해금한다.
// 소유한 기존 유닛과 기존 설치물은 연구 조건이 달라져도 삭제하지 않는다.
export const ECONOMY_TECH_TREE=Object.freeze({
 spearman:[['lumber',2]],
 crossbow:[['fletcher',1],['iron',1]],
 shield:[['smith',1],['armory',1]],
 knight:[['smith',2],['armory',1],['hovel',2],['knightHall',1]],
 sapper:[['quarry',2],['smith',1]],
 ram:[['lumber',2],['stockpile',2],['armory',1]],
 trebuchet:[['quarry',2],['smith',2],['iron',1]],
 siegeTower:[['lumber',3],['armory',2],['stockpile',2]],
 net:[['fletcher',1]],
 log:[['lumber',2]],
 barrel:[['winery',1],['smith',1]]
});
export function economyTechStatus(state,id){
 const requirements=ECONOMY_TECH_TREE[id]||[];
 const e=getEconomy(state);
 const missing=requirements.map(([name,level])=>{
  const def=ECONOMY_BY_ID.get(name),building=e?.buildings?.[name];
  return building?.count&&building.level>=level?null:(def?.name||name)+' '+level+'단계';
 }).filter(Boolean);
 return {unlocked:missing.length===0,requirements,missing};
}

const ECONOMY_STEP=6;
export function getEconomy(state){
 if(!state||typeof state!=='object')return null;
 let e=state.economyV4;
 if(!e||typeof e!=='object'||Array.isArray(e)){
   const p=state.productionBuildings||{};
   e={version:1,timer:0,policy:{ration:'normal',tax:'normal',autoTrade:'off'},satisfaction:65,buildings:{
     lumber:{count:1,level:Math.max(1,Number(p.lumberLevel)||1),sites:[{x:245,y:850}]},
     quarry:{count:1,level:Math.max(1,Number(p.mineLevel)||1),sites:[{x:785,y:965}]},
     stockpile:{count:1,level:1,sites:[{x:390,y:820}]},granary:{count:1,level:1,sites:[{x:870,y:480}]},hovel:{count:1,level:1,sites:[{x:610,y:335}]}
   }};
   state.economyV4=e;
   state.inventory=state.inventory||{};
   state.inventory.wood=Math.max(8,Number(state.inventory.wood)||0);
   state.inventory.stone=Math.max(6,Number(state.inventory.stone)||0);
   state.inventory.food=Math.max(18,Number(state.inventory.food)||0);
   // 주민은 자동으로 고용되고 집에서 출퇴근한다. 최초 수동 구매 불필요.
   state.villageDevelopment=state.villageDevelopment||{};
   state.villageDevelopment.townHallBuilt=true;
   const prod=state.productionBuildings||{};
   prod.lumberBuilt=true;prod.mineBuilt=true;
   prod.lumberLevel=Math.max(1,Number(prod.lumberLevel)||1);
   prod.mineLevel=Math.max(1,Number(prod.mineLevel)||1);
   state.productionBuildings=prod;
   activeRuntime?.queueSaveProgress(state);
 }
 e.timer=Math.max(0,Math.min(ECONOMY_STEP,Number(e.timer)||0));
 e.policy=e.policy&&typeof e.policy==='object'?e.policy:{ration:'normal',tax:'normal',autoTrade:'off'};
 e.satisfaction=Math.max(0,Math.min(100,Number(e.satisfaction)||65));
 e.buildings=e.buildings&&typeof e.buildings==='object'?e.buildings:{};
 for(const def of ECONOMY_BUILDINGS){
   const entry=e.buildings[def.id];
   if(entry)e.buildings[def.id]={...entry,
     sites:Array.isArray(entry.sites)?entry.sites.filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)).slice(0,def.max):[],
     count:Math.max(0,Math.min(def.max,Math.floor(Number(entry.count)||0))),
     level:Math.max(1,Math.min(3,Math.floor(Number(entry.level)||1)))
   };
 }
 return e;
}
export function economyStaff(state){
 const e=getEconomy(state),capacity=6+(e.buildings.hovel?.count||0)*4;
 let open=capacity;
 const staff={};
 for(const def of ECONOMY_BUILDINGS){
   const count=e.buildings[def.id]?.count||0;
   const staffed=def.jobs?Math.min(count,Math.floor(open/def.jobs)):count;
   staff[def.id]=staffed;
   open-=staffed*def.jobs;
 }
 return {capacity,assigned:capacity-open,available:open,staff};
}
function cash(state,key){return key==='coins'?state.coins:Number(state.inventory?.[key]||0)}
function grant(state,key,amount){if(key==='coins')state.coins+=amount;else state.inventory[key]=(Number(state.inventory[key])||0)+amount}
export function constructEconomyBuilding(id,site=null){
 const state=currentGame?.state,def=ECONOMY_BY_ID.get(id);
 if(!state||!def)return false;
 const e=getEconomy(state),entry=e.buildings[id]||{count:0,level:1};
 if(entry.count>=def.max){toast(def.name+' 건설 한도 도달');return false}
 if(cash(state,'wood')<def.wood||cash(state,'stone')<def.stone||cash(state,'coins')<def.gold){
   toast('자원 부족 · 나무 '+def.wood+' 돌 '+def.stone+' 금화 '+def.gold);return false;
 }
 grant(state,'wood',-def.wood);grant(state,'stone',-def.stone);grant(state,'coins',-def.gold);
 entry.count++;if(!Array.isArray(entry.sites))entry.sites=[];
 const n=entry.count-1,position=site&&Number.isFinite(site.x)&&Number.isFinite(site.y)?site:{x:def.x+(n%3)*145,y:def.y+Math.floor(n/3)*135};
 entry.sites.push({x:Math.round(position.x),y:Math.round(position.y)});e.buildings[id]=entry;
 if(id==='lumber'||id==='quarry'){
   const p=ensureProduction(state);const isLumber=id==='lumber';
   p[isLumber?'lumberBuilt':'mineBuilt']=true;
   p[isLumber?'lumberLevel':'mineLevel']=entry.level;
 }
 saveState(state);toast('🏗️ '+def.name+' 건설 · 자동 일꾼 배치');
 return true;
}
export function upgradeEconomyBuilding(id){
 const state=currentGame?.state,def=ECONOMY_BY_ID.get(id);
 if(!state||!def)return false;
 const e=getEconomy(state),entry=e.buildings[id];
 if(!entry?.count||entry.level>=3){toast('건물이 없거나 최고 레벨이야');return false}
 const wood=def.wood+entry.level*5,stone=def.stone+entry.level*3,gold=def.gold+entry.level*6;
 if(cash(state,'wood')<wood||cash(state,'stone')<stone||cash(state,'coins')<gold){
   toast('강화 자원 부족 · 나무 '+wood+' 돌 '+stone+' 금화 '+gold);return false;
 }
 grant(state,'wood',-wood);grant(state,'stone',-stone);grant(state,'coins',-gold);
 entry.level++;
 const p=ensureProduction(state);
 if(id==='lumber')p.lumberLevel=entry.level;
 if(id==='quarry')p.mineLevel=entry.level;
 saveState(state);toast('⬆️ '+def.name+' '+entry.level+'단계 · 자동 생산 증가');
 return true;
}
export function setEconomyPolicy(id,value){
 const state=currentGame?.state;if(!state)return false;
 const e=getEconomy(state),allowed={ration:['low','normal','high'],tax:['low','normal','high'],autoTrade:['off','wood','stone']};
 if(!allowed[id]?.includes(value))return false;
 e.policy[id]=value;saveState(state);return true;
}
function advanceEconomy(dt){
 const state=currentGame?.state;if(!state||document.hidden||activeRuntime?.paused)return;
 const e=getEconomy(state);if(!e)return;
 e.timer+=dt;if(e.timer<ECONOMY_STEP)return;
 const steps=Math.min(6,Math.floor(e.timer/ECONOMY_STEP));e.timer%=ECONOMY_STEP;
 const {staff}=economyStaff(state);
 for(let tick=0;tick<steps;tick++)for(const def of ECONOMY_BUILDINGS){
   const entry=e.buildings[def.id],count=staff[def.id]||0;
   if(!entry||!count||!def.out)continue;
   let qty=count*entry.level,amount=qty*def.amount;
   if(def.input){
     const stock=cash(state,def.input),cycles=Math.min(qty,Math.floor(stock/def.need));
     if(cycles<=0)continue;
     grant(state,def.input,-cycles*def.need);amount=cycles*def.amount;
   }
   if(amount)grant(state,def.out,amount);
 }
 const policy=e.policy;
 const homes=e.buildings.hovel?.count||1,pop=6+homes*4;
 const rations={low:1,normal:2,high:3},tax={low:0,normal:1,high:2};
 for(let i=0;i<steps;i++){
   const need=pop*(rations[policy.ration]||2)/5;
   const consumed=Math.min(Number(state.inventory.food)||0,need);
   grant(state,'food',-consumed);
   e.satisfaction=Math.min(100,Math.max(0,e.satisfaction+(consumed<need?-4:policy.ration==='high'?1:.1)-(tax[policy.tax]||0)*.55));
   grant(state,'coins',Math.max(0,Math.floor(pop*(tax[policy.tax]||0)*e.satisfaction/110)));
   if(policy.autoTrade==='wood'&&state.inventory.wood>75){grant(state,'wood',-10);grant(state,'coins',17)}
   if(policy.autoTrade==='stone'&&state.inventory.stone>65){grant(state,'stone',-8);grant(state,'coins',22)}
 }
 const p=ensureProduction(state);
 // 이전 버전의 생산품은 지급해 중복 지급 없이 기존 보관분을 보존한다.
 if(p.bufferWood||p.bufferStone){
   grant(state,'wood',p.bufferWood);grant(state,'stone',p.bufferStone);
   p.bufferWood=0;p.bufferStone=0;
 }
 saveState(state);
}

function runProduction(dt) {
  advanceEconomy(dt);
}

function productionTick() {
  const now = performance.now();
  const dt = Math.min(1, Math.max(0, (now - lastTick) / 1000));
  lastTick = now;
  runProduction(dt);
  patchPanels();
  updateBuildButton();
}

function patchPanels() {
  if (!currentGame) return;
  const state = currentGame.state;
  const p = ensureProduction(state);
  const total = totalWorkers(state);
  const title = document.querySelector('#panelTitle')?.textContent || '';
  const body = document.querySelector('#panelBody');
  if (!body) return;

  if (title === '가방') {
    for (const note of body.querySelectorAll('.panel-note')) {
      if (note.textContent.includes('노비')) {
        const next = note.textContent.replace(/노비\s+\d+\/3/, `노비 ${total}/3 (농사 ${workerNumber(state.workers)} · 벌목 ${p.lumberWorker} · 광산 ${p.mineWorker})`);
        if (next !== note.textContent) note.textContent = next;
      }
    }
  }

  if (title === '노비 판매소') {
    const buy = body.querySelector('[data-worker]');
    if (buy) {
      buy.disabled = total >= WORKER_MAX;
      const span = buy.querySelector('span');
      if (span) span.textContent = `🧑‍🌾 노비 구매 (${total}/${WORKER_MAX})`;
    }
    for (const card of body.querySelectorAll('.item-card')) {
      if (card.textContent.includes('노비')) {
        const span = card.querySelector('span');
        if (span) span.textContent = `${total}명`;
      }
    }
    const firstNote = body.querySelector('.panel-note');
    if (firstNote) firstNote.textContent = '농사 노비는 물주기·수확을 해. 벌목장/광산에 배치한 노비는 5초마다 자원을 모으고 1분마다 지급해.';
    let status = body.querySelector('[data-job-status]');
    if (!status) {
      status = document.createElement('p');
      status.className = 'panel-note';
      status.dataset.jobStatus = '1';
      body.appendChild(status);
    }
    status.textContent = `작업 배치 · 농사 ${workerNumber(state.workers)}명 · 벌목 ${p.lumberWorker}명 · 광산 ${p.mineWorker}명 · 작업장 보관 나무 ${p.bufferWood} / 돌 ${p.bufferStone}`;
  }
}

document.addEventListener('click', event => {
  const buy = event.target.closest?.('[data-worker]');
  if (!buy || !currentGame) return;
  if (totalWorkers(currentGame.state) < WORKER_MAX) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  toast('노비는 최대 3명이야');
}, true);

const observer = new MutationObserver(patchPanels);
observer.observe(document.documentElement, { subtree: true, childList: true, attributes: true });

const rendererProto = IslandRendererV3.prototype;
const originalDraw = rendererProto.draw;
const originalDrawObjects = rendererProto.drawObjects;

rendererProto.draw = function drawWithProduction(game) {
  currentGame = game;
  activeRuntime = activeRuntime || null;
  reconcileWorkers(game.state);
  originalDraw.call(this, game);
  updateBuildButton();
  patchPanels();
};

rendererProto.drawObjects = function drawObjectsWithProduction(ctx, game) {
  originalDrawObjects.call(this, ctx, game);
  const p = ensureProduction(game.state);
  drawLumberyard(ctx, p);
  drawMine(ctx, p);
  ctx.save();
  ctx.fillStyle = '#315748';
  ctx.font = '700 11px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText(`농사 노비 ${workerNumber(game.state.workers)}명 · 농장 더블탭 = 작업장 노비 복귀`, 1040, 565);
  ctx.restore();
};

function drawLumberyard(ctx, p) {
  ctx.save();
  ctx.textAlign = 'center';
  if (!p.lumberBuilt) {
    ctx.setLineDash([7, 6]);
    ctx.strokeStyle = '#6d725d';
    ctx.lineWidth = 3;
    ctx.strokeRect(LUMBER.x - 55, LUMBER.y - 38, 110, 76);
    ctx.setLineDash([]);
    ctx.font = '28px system-ui';
    ctx.fillText('🪓', LUMBER.x, LUMBER.y + 8);
    ctx.fillStyle = '#315748';
    ctx.font = '700 11px system-ui';
    ctx.fillText('벌목장 건설터 · 나무3 돌1', LUMBER.x, LUMBER.y + 58);
  } else {
    ctx.fillStyle = '#a97849';
    ctx.fillRect(LUMBER.x - 55, LUMBER.y - 32, 110, 70);
    ctx.fillStyle = '#6f5034';
    ctx.beginPath();
    ctx.moveTo(LUMBER.x - 66, LUMBER.y - 32);
    ctx.lineTo(LUMBER.x, LUMBER.y - 70);
    ctx.lineTo(LUMBER.x + 66, LUMBER.y - 32);
    ctx.closePath();
    ctx.fill();
    ctx.font = '28px system-ui';
    ctx.fillText('🪵', LUMBER.x, LUMBER.y + 12);
    if (p.lumberWorker) ctx.fillText('🧑‍🌾', LUMBER.x + 48, LUMBER.y + 20);
    ctx.fillStyle = '#315748';
    ctx.font = '700 11px system-ui';
    ctx.fillText(p.lumberWorker ? '벌목장 · 노비 작업중 · 5초 +1' : '벌목장 · 더블탭 노비 배치', LUMBER.x, LUMBER.y + 58);
  }
  ctx.restore();
}

function drawMine(ctx, p) {
  ctx.save();
  ctx.textAlign = 'center';
  if (!p.mineBuilt) {
    ctx.setLineDash([7, 6]);
    ctx.strokeStyle = '#6d725d';
    ctx.lineWidth = 3;
    ctx.strokeRect(MINE.x - 55, MINE.y - 38, 110, 76);
    ctx.setLineDash([]);
    ctx.font = '28px system-ui';
    ctx.fillText('⛏️', MINE.x, MINE.y + 8);
    ctx.fillStyle = '#315748';
    ctx.font = '700 11px system-ui';
    ctx.fillText('광산 건설터 · 나무2 돌3', MINE.x, MINE.y + 58);
  } else {
    ctx.fillStyle = '#77756f';
    ctx.beginPath();
    ctx.ellipse(MINE.x, MINE.y + 3, 65, 43, 0, Math.PI, Math.PI * 2);
    ctx.lineTo(MINE.x + 65, MINE.y + 35);
    ctx.lineTo(MINE.x - 65, MINE.y + 35);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#3e403e';
    ctx.beginPath();
    ctx.arc(MINE.x, MINE.y + 12, 28, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.font = '27px system-ui';
    ctx.fillText('⛏️', MINE.x, MINE.y + 9);
    if (p.mineWorker) ctx.fillText('🧑‍🌾', MINE.x + 53, MINE.y + 20);
    ctx.fillStyle = '#315748';
    ctx.font = '700 11px system-ui';
    ctx.fillText(p.mineWorker ? '광산 · 노비 작업중 · 5초 +1' : '광산 · 더블탭 노비 배치', MINE.x, MINE.y + 58);
  }
  ctx.restore();
}

// 전략형 UI는 성채 패널에서 건설하므로 플레이어 근접 건설 버튼을 만들지 않는다.
setInterval(productionTick, 100);
