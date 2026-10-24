import { JaewoonVibeRuntime } from '../../assets/vibe-runtime.js';
import { IslandRendererV3 } from './render-v3.js';
import { assignWorker, returnWorkerToFarm, buildLumberyard, buildMine, upgradeProduction, ECONOMY_BUILDINGS, getEconomy, economyStaff, constructEconomyBuilding, upgradeEconomyBuilding, setEconomyPolicy } from './production-buildings.js';

const TOWER = { x: 400, y: 1090, wood: 6, stone: 5, radius: 115 };
const TOWN_HALL = { x: 1010, y: 1090, wood: 12, stone: 10, radius: 125 };
const VILLAGE = { minX: 120, maxX: 1360, baseY: 1018, maxY: 1155 };
const TOWER_RANGE = 700;
const TOWER_DAMAGE = 18;
const TOWER_COOLDOWN = 1.2;

let currentGame = null;
let activeRuntime = null;
let towerTimer = 0;
let lastTick = performance.now();
let lastMoveTick = performance.now();
let towerShot = null;
const pressed = new Set();
// 메인: 기존 마을회관·방어탑을 확장하는 공성 방어 상태. 원본 습격·병력 수치는 유지한다.
const FORT_KEYS=['gate','north','south'];
const WALL_BASE={gate:360,north:280,south:280};
const TRAP_SITES=[{x:1470,y:430},{x:1440,y:540},{x:1450,y:650},{x:1460,y:770},{x:1500,y:865},{x:1560,y:620}];
const TRAP_TYPES={
 spikes:{name:'말뚝 울타리',wood:3,stone:2,damage:26,charges:8},
 pit:{name:'함정 구덩이',wood:2,stone:4,damage:15,charges:6},
 net:{name:'투척 그물',wood:5,stone:1,damage:8,charges:5},
 oil:{name:'끓는 기름',wood:4,stone:5,damage:46,charges:4},
 log:{name:'통나무 낙하',wood:7,stone:2,damage:38,charges:5},
 barrel:{name:'폭발 항아리',wood:6,stone:6,damage:75,charges:2}
};
const GUARD_SITES=[
  {name:'동쪽 성문',x:1285,y:608},{name:'북쪽 성벽',x:790,y:235},
  {name:'남쪽 성벽',x:1170,y:985},{name:'성채 예비대',x:1100,y:955}
];
const RAID_TIME_OPTIONS=[60,120,180,300,600];
const SIEGE_MODES=['off','third','always'];
const KEEP_HP=900;
// 상선 시장: 구매/판매 가격과 수요 변동은 기존 성채 저장 데이터에서 관리한다.
const MARKET_GOODS=[
  {id:'wood',name:'🪵 나무',amount:4,buy:20,sell:14},
  {id:'stone',name:'🪨 돌',amount:3,buy:24,sell:16},
  {id:'food',name:'🍖 식량',amount:12,buy:25,sell:17},
  {id:'fish',name:'🐟 물고기',amount:1,buy:22,sell:14},
  {id:'crop',name:'🥕 농작물',amount:1,buy:31,sell:20},
  {id:'flower',name:'🌼 꽃',amount:1,buy:8,sell:4}
];
let fortSaveCarry=0;


const originalLoadProgress = JaewoonVibeRuntime.prototype.loadProgress;
const originalQueueSaveProgress = JaewoonVibeRuntime.prototype.queueSaveProgress;

function ensureVillage(state) {
  if (!state || typeof state !== 'object') return null;
  const village=state.villageDevelopment && typeof state.villageDevelopment==='object' ? state.villageDevelopment : {};
  village.defenseTowerBuilt=Boolean(village.defenseTowerBuilt);
  village.defenseTowerLevel=village.defenseTowerBuilt?Math.max(1,Math.min(3,Math.floor(Number(village.defenseTowerLevel)||1))):0;
  village.townHallBuilt=Boolean(village.townHallBuilt);
  // 저장 호환: 기존 키와 타 확장 스크립트의 추가 필드는 그대로 보존한다.
  let fort=village.fortification;
  if(!fort||typeof fort!=='object'||Array.isArray(fort)){fort={};village.fortification=fort}
  if(!Number.isInteger(fort.wallTier)||fort.wallTier<1||fort.wallTier>3)fort.wallTier=1;
  if(!fort.walls||typeof fort.walls!=='object')fort.walls={};
  for(const key of FORT_KEYS)if(!Number.isFinite(fort.walls[key]))
    fort.walls[key]=WALL_BASE[key]+(fort.wallTier-1)*180;
  if(!Array.isArray(fort.traps)||fort.traps.length!==TRAP_SITES.length)
    fort.traps=Array.from({length:TRAP_SITES.length},(_,i)=>fort.traps?.[i]||null);
  if(!Array.isArray(fort.guardPosts)||fort.guardPosts.length!==GUARD_SITES.length)
    fort.guardPosts=Array.from({length:GUARD_SITES.length},(_,i)=>fort.guardPosts?.[i]||null);
  if(!Number.isFinite(fort.traderClock)||fort.traderClock<0)fort.traderClock=0;
  // 기존 2분 습격과 저장 구조를 유지하며 새 옵션을 선택한 경우에만 시간을 바꾼다.
  if(!RAID_TIME_OPTIONS.includes(fort.raidIntervalSec))fort.raidIntervalSec=120;
  if(!SIEGE_MODES.includes(fort.siegeAuto))fort.siegeAuto='off';
  fort.siegeRequested=fort.siegeRequested===true;
  fort.drawbridgeClosed=fort.drawbridgeClosed!==false;
  fort.moatBuilt=fort.moatBuilt===true;
  fort.siegeVictories=Math.max(0,Math.floor(Number(fort.siegeVictories)||0));
  fort.siegeDefeats=Math.max(0,Math.floor(Number(fort.siegeDefeats)||0));
  if(!Number.isFinite(fort.keepHp))fort.keepHp=KEEP_HP;
  fort.keepHp=Math.max(0,Math.min(KEEP_HP,fort.keepHp));
  // 스트롱홀드식 성채 운영: 기존 세이브를 유지하며 보급·사기·명예와 방어 명령만 확장.
  if(!['hold','volley','counter'].includes(fort.defenseOrder))fort.defenseOrder='hold';
  fort.morale=Math.max(0,Math.min(100,Number.isFinite(fort.morale)?fort.morale:65));
  fort.honor=Math.max(0,Math.min(999,Math.floor(Number(fort.honor)||0)));
  fort.supplyClock=Math.max(0,Number(fort.supplyClock)||0);
  if(!fort.marketPressure||typeof fort.marketPressure!=='object'||Array.isArray(fort.marketPressure))
    fort.marketPressure={};
  for(const item of MARKET_GOODS){
    const n=Number(fort.marketPressure[item.id]);
    fort.marketPressure[item.id]=Number.isFinite(n)?Math.max(-.2,Math.min(.2,n)):0;
  }
  state.villageDevelopment=village;
  return village;
}

JaewoonVibeRuntime.prototype.loadProgress = function loadWithVillage(fallback = {}) {
  const progress = originalLoadProgress.call(this, fallback);
  activeRuntime = this;
  ensureVillage(progress);
  return progress;
};

JaewoonVibeRuntime.prototype.queueSaveProgress = function saveWithVillage(progress, delay) {
  activeRuntime = this;
  ensureVillage(progress);
  return originalQueueSaveProgress.call(this, progress, delay);
};

function saveState() {
  if (!currentGame?.state) return;
  ensureVillage(currentGame.state);
  activeRuntime?.queueSaveProgress(currentGame.state);
}

function toast(message) {
  const el = document.querySelector('#toast');
  if (!el) return;
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove('show'), 2100);
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// 메인: 성채 메뉴는 기존 이벤트를 사용하고 플레이어 근접 건설 UI는 만들지 않는다.
function setupBuildButton() {
  if (document.querySelector('#castleManageButton')) return;
  const button=document.createElement('button');
  button.id='castleManageButton';
  button.type='button';
  button.hidden=true;
  button.addEventListener('click',openCastle);
  document.querySelector('#app')?.appendChild(button);
}

function updateBuildButton() {
  const button = document.querySelector('#villageBuildButton');
  if (!button || !currentGame) return;
  const village = ensureVillage(currentGame.state);
  const player = currentGame.player;
  let kind = '';
  if (!village.defenseTowerBuilt && distance(player, TOWER) <= TOWER.radius) kind = 'tower';
  else if (!village.townHallBuilt && distance(player, TOWN_HALL) <= TOWN_HALL.radius) kind = 'hall';
  if (!kind) {
    button.style.display = 'none';
    button.dataset.kind = '';
    return;
  }
  button.style.display = 'block';
  button.dataset.kind = kind;
  button.textContent = kind === 'tower'
    ? '🗼 방어탑 건설 · 나무6 돌5'
    : '🏛️ 마을회관 건설 · 나무12 돌10';
}

function canPay(wood, stone) {
  const inv = currentGame?.state?.inventory;
  return inv && (Number(inv.wood) || 0) >= wood && (Number(inv.stone) || 0) >= stone;
}

function spend(wood, stone) {
  const inv = currentGame.state.inventory;
  inv.wood -= wood;
  inv.stone -= stone;
}

function buildTower() {
  if (!currentGame) return;
  const village = ensureVillage(currentGame.state);
  if (village.defenseTowerBuilt) return;
  if (!canPay(TOWER.wood, TOWER.stone)) {
    toast('방어탑 재료 부족 · 나무6 돌5');
    return;
  }
  spend(TOWER.wood, TOWER.stone);
  village.defenseTowerBuilt = true;
  village.defenseTowerLevel = 1;
  saveState();
  updateBuildButton();
  toast('🗼 방어탑 완성 · 습격 적을 자동 공격해');
}

function buildTownHall() {
  if (!currentGame) return;
  const village = ensureVillage(currentGame.state);
  if (village.townHallBuilt) return;
  if (!canPay(TOWN_HALL.wood, TOWN_HALL.stone)) {
    toast('마을회관 재료 부족 · 나무12 돌10');
    return;
  }
  spend(TOWN_HALL.wood, TOWN_HALL.stone);
  village.townHallBuilt = true;
  saveState();
  updateBuildButton();
  toast('🏛️ 마을회관 완성 · 넓어진 마을의 중심이 생겼어');
}

function livingRaidEnemies() {
  return (currentGame?.enemies || []).filter(enemy => enemy && enemy.hp > 0);
}

function runTower(dt) {
  if (!currentGame?.state) return;
  const village = ensureVillage(currentGame.state);
  if (!village.defenseTowerBuilt || !currentGame.raidActive) {
    towerTimer = 0;
    return;
  }
  towerTimer += dt;
  const fort=village.fortification;
  const cooldown=fort?.defenseOrder==='volley'?TOWER_COOLDOWN*.7:TOWER_COOLDOWN;
  if (towerTimer < cooldown) return;
  towerTimer %= cooldown;
  let target = null;
  let best = TOWER_RANGE;
  for (const enemy of livingRaidEnemies()) {
    const d = Math.hypot(enemy.x - TOWER.x, enemy.y - TOWER.y);
    if (d < best) {
      best = d;
      target = enemy;
    }
  }
  if (!target) return;
  target.hp -= TOWER_DAMAGE*village.defenseTowerLevel*(fort?.defenseOrder==='volley'?1.35:1);
  towerShot = { x1: TOWER.x, y1: TOWER.y - 55, x2: target.x, y2: target.y, until: performance.now() + 180 };
}

function villageTick() {
  const now = performance.now();
  const dt = Math.min(.2, Math.max(0, (now - lastTick) / 1000));
  lastTick = now;
  if (!document.hidden && !activeRuntime?.paused && !document.querySelector('dialog[open]')){
    runTower(dt);
    runFortification(dt);
  }
  patchPanels();
}

function patchPanels() {
  if (!currentGame) return;
  const panel = document.querySelector('#panel');
  const body = document.querySelector('#panelBody');
  const title = document.querySelector('#panelTitle')?.textContent || '';
  if (!panel?.open || !body || (title !== '가방' && title !== '자원')) return;
  let note = body.querySelector('[data-village-status]');
  if (!note) {
    note = document.createElement('p');
    note.className = 'panel-note';
    note.dataset.villageStatus = '1';
    body.appendChild(note);
  }
  const village = ensureVillage(currentGame.state);
  const fort=village.fortification;
  note.textContent = `마을 시설 · 방어탑 ${village.defenseTowerBuilt ? '완성' : '미건설'} · 마을회관 ${village.townHallBuilt ? '완성' : '미건설'} · 성벽 ${fort.wallTier}단계 · 함정 ${fort.traps.filter(Boolean).length}/${TRAP_SITES.length} · 남쪽 마을 구역 확장됨`;
}


// 같은 상선 시장을 전략 패널과 성채 관리 패널에서 재사용한다.
function marketQuote(fort,day,item,type){
  const idx=MARKET_GOODS.indexOf(item);
  const trend=Math.sin(Number(day||1)*.87+idx*1.57)*.16;
  const pressure=Number(fort.marketPressure?.[item.id])||0;
  return Math.max(1,Math.round((type==='buy'?item.buy:item.sell)*(1+trend+pressure)));
}
function marketContent(state,fort){
  const trader=fort.traderClock%180<75;
  const balance=Math.floor(Number(state.coins)||0);
  const stock=state.inventory||{};
  let html='<p class="panel-note">'+(trader?'⚓ 상선 입항 중 · 거래 가능':'🌊 상선 항해 중 · '+Math.ceil(180-fort.traderClock%180)+'초 뒤 입항')+
    ' · 현재 자금 '+balance+'골드 · 자원별 가격은 수요와 날짜에 따라 변해.</p>';
  html+='<div class="inventory-grid"><div class="item-card">🪙 보유 골드<span>'+balance+'</span></div>'+
    '<div class="item-card">📦 거래 품목<span>'+MARKET_GOODS.length+'종</span></div></div>';
  for(const item of MARKET_GOODS){
    const count=Math.max(0,Math.floor(Number(stock[item.id])||0));
    const buy=marketQuote(fort,state.day,item,'buy');
    const sell=marketQuote(fort,state.day,item,'sell');
    html+='<div class="market-item"><strong>'+item.name+' · '+count+'개 보유</strong><div class="market-actions">'+
      '<button type="button" class="choice" data-castle="trade:buy:'+item.id+'" '+(!trader||balance<buy?'disabled':'')+'><span>구매 '+item.amount+'개</span><b>-'+buy+'골드</b></button>'+
      '<button type="button" class="choice" data-castle="trade:sell:'+item.id+'" '+(!trader||count<item.amount?'disabled':'')+'><span>판매 '+item.amount+'개</span><b>+'+sell+'골드</b></button></div></div>';
  }
  html+='<button type="button" class="wide-button" data-castle="trade:all" '+(!trader?'disabled':'')+'>🚢 생산품 일괄 판매 (물고기 · 농작물 · 꽃)</button>';
  html+='<p class="panel-note">벌목·광산·농장 생산 → 창고 → 상선 무역 → 성벽·병력 투자. 건설용 나무·돌·식량은 일괄 판매에서 제외돼.</p>';
  return html;
}
function openTrade(){
  if(!currentGame||document.querySelector('dialog[open]'))return;
  document.querySelector('#panelTitle').textContent='⚓ 무역 · 경제';
  renderTrade();
  document.querySelector('#panel').showModal();
}
function renderTrade(){
  if(!currentGame)return;
  const state=currentGame.state,fort=ensureVillage(state).fortification;
  const body=document.querySelector('#panelBody');
  body.innerHTML=marketContent(state,fort);
  body.querySelectorAll('[data-castle]').forEach(button=>button.addEventListener('click',()=>manageCastle(button.dataset.castle)));
}
window.addEventListener('cozy:open-trade',openTrade);

/* 메인: 기존 성채 관리 패널 - 병력 배치, 성벽 강화/수리, 함정, 주민 전직, 상선 거래 */
function openCastle(){
  if(!currentGame||document.querySelector('dialog[open]'))return;
  document.querySelector('#panelTitle').textContent='성채 · 병력 · 무역 관리';
  renderConstruction('industry');
  document.querySelector('#panel').showModal();
}
// 공성 명령은 별도 캐릭터 조작이 아니라 기존 성채 전술 메뉴로 진입한다.
function openSiege(){
  if(!currentGame||document.querySelector('dialog[open]'))return;
  openCastle();
  const body=document.querySelector('#panelBody');
  const button=body?.querySelector('[data-castle="siege:start"]');
  if(button)body.scrollTop=Math.max(0,button.offsetTop-170);
}
window.addEventListener('cozy:open-siege',openSiege);
// 영주 건설 메뉴: 상용 RTS의 건물 카테고리/비용/작업자/생산 카드.
const BUILD_GROUPS=[
 ['industry','🪓 자원'],['food','🌾 식량'],['wine','🍷 양조'],
 ['town','🏘️ 도시'],['military','⚔️ 군수'],['defense','🏰 성벽·함정']
];
let activeBuildGroup='industry';
function renderConstruction(group=activeBuildGroup){
 const state=currentGame?.state;if(!state)return;
 const e=getEconomy(state);activeBuildGroup=group;
 const {capacity,assigned,staff}=economyStaff(state);
 const inv=state.inventory||{},body=document.querySelector('#panelBody');
 document.querySelector('#panelTitle').textContent='🏰 왕국 건설·경제';
 const format=(n)=>Math.max(0,Math.floor(Number(n)||0));
 const tabs=BUILD_GROUPS.map(([id,name])=>'<button class="realm-tab '+(group===id?'selected':'')+'" type="button" data-realm-tab="'+id+'">'+name+'</button>').join('');
 let html='<div class="realm-overview"><div><strong>👷 '+assigned+'/'+capacity+'</strong><small>자동 배치 일꾼</small></div><div><strong>🪵 '+format(inv.wood)+'</strong><small>목재</small></div><div><strong>🪨 '+format(inv.stone)+'</strong><small>석재</small></div><div><strong>🪙 '+format(state.coins)+'</strong><small>금화</small></div></div>';
 html+='<div class="realm-tabs" role="group" aria-label="건설 종류">'+tabs+'</div>';
 if(group==='defense'){
   html+='<p class="realm-help">성벽·성문·망루·함정·해자: 비용을 내고 방어선을 강화하거나 원하는 위치의 건설 부지를 선택하세요.</p>';
   html+='<button class="realm-main-command" type="button" data-realm-legacy>🏰 성벽 · 함정 · 대공성전 관리 열기</button>';
   html+='<button class="realm-main-command" type="button" data-realm-barracks>⚔️ 병영 모집과 주둔 명령</button>';
 }else{
   const list=ECONOMY_BUILDINGS.filter(d=>d.group===group);
   html+='<p class="realm-help">건물을 고른 다음 지도의 땅을 누르면 건설합니다. 일꾼은 남는 인구에서 자동 배치되고 산출물은 창고에 바로 적립됩니다.</p>';
   html+='<div class="realm-build-grid">'+list.map(d=>{
     const entry=e.buildings[d.id]||{count:0,level:1},n=entry.count||0;
     const affordable=(Number(inv.wood)||0)>=d.wood&&(Number(inv.stone)||0)>=d.stone&&(Number(state.coins)||0)>=d.gold;
     const cost=['🪵 '+d.wood,'🪨 '+d.stone,...(d.gold?['🪙 '+d.gold]:[])].join(' · ');
     const product=d.out?d.out+' +'+d.amount*(entry.level||1)+'/주기':'영지 기능';
     const buildable=n<d.max&&affordable;
     return '<article class="realm-build-card"><div class="realm-build-title"><span class="realm-icon">'+d.icon+'</span><div><b>'+d.name+'</b><small>'+d.desc+'</small></div><strong>'+n+'/'+d.max+'</strong></div>'+
       '<div class="realm-build-meta"><span>👷 '+d.jobs+'명/채</span><span>'+product+'</span><span>Lv.'+(n?entry.level:0)+'/3</span></div>'+
       '<div class="realm-build-actions"><button type="button" data-build-economy="'+d.id+'" '+(buildable?'':'disabled')+'>'+ (n>=d.max?'최대 건설':affordable?'🏗️ 건설':'자원 부족')+'</button>'+
       '<button type="button" class="upgrade" data-upgrade-economy="'+d.id+'" '+(!n||entry.level>=3?'disabled':'')+'>⬆️ 강화</button></div>'+
       '<div class="realm-build-cost">'+cost+' · '+(staff[d.id]||0)+'채 가동</div></article>';
   }).join('')+'</div>';
 }
 html+='<div class="realm-policy"><h3>📜 영지 운영 정책</h3><p>주민 만족도 '+Math.floor(e.satisfaction)+'/100 · 생산한 자원은 실시간 창고로 입고</p>';
 for(const [key,title,values] of [
   ['ration','🍞 식량 배급',[['low','절약'],['normal','보통'],['high','풍족']]],
   ['tax','💰 세금',[['low','면세'],['normal','보통'],['high','높음']]],
   ['autoTrade','⚖️ 자동 판매',[['off','끄기'],['wood','남는 나무'],['stone','남는 돌']]]
 ]){
   html+='<div class="realm-policy-row"><span>'+title+'</span><div>'+values.map(([v,t])=>'<button type="button" class="'+(e.policy[key]===v?'selected':'')+'" data-realm-policy="'+key+':'+v+'">'+t+'</button>').join('')+'</div></div>';
 }
 html+='</div><button type="button" class="realm-legacy-entry" data-realm-legacy>🏰 기존 성채 상세 관리 · 성벽 수리·함정·병력 배치</button>';
 body.innerHTML=html;
 body.querySelectorAll('[data-realm-tab]').forEach(b=>b.addEventListener('click',()=>renderConstruction(b.dataset.realmTab)));
 body.querySelectorAll('[data-build-economy]').forEach(b=>b.addEventListener('click',()=>{
   const id=b.dataset.buildEconomy;document.querySelector('#panel')?.close();
   window.dispatchEvent(new CustomEvent('cozy:place-building',{detail:{id}}));
 }));
 body.querySelectorAll('[data-upgrade-economy]').forEach(b=>b.addEventListener('click',()=>{
   upgradeEconomyBuilding(b.dataset.upgradeEconomy);renderConstruction(activeBuildGroup);
 }));
 body.querySelectorAll('[data-realm-policy]').forEach(b=>b.addEventListener('click',()=>{
   const [id,value]=b.dataset.realmPolicy.split(':');
   setEconomyPolicy(id,value);renderConstruction(activeBuildGroup);
 }));
 body.querySelectorAll('[data-realm-legacy]').forEach(b=>b.addEventListener('click',()=>{
   document.querySelector('#panelTitle').textContent='성채 · 병력 · 무역 관리';renderCastle();
 }));
 body.querySelectorAll('[data-realm-barracks]').forEach(b=>b.addEventListener('click',()=>{
   document.querySelector('#panel')?.close();document.querySelector('#barracksCommand')?.click();
 }));
}
window.addEventListener('cozy:open-construction',e=>{
 if(!currentGame||document.querySelector('dialog[open]'))return;
 renderConstruction(e.detail?.group||'industry');
 document.querySelector('#panel')?.showModal();
});

function renderCastle(){
  const state=currentGame?.state;
  if(!state)return;
  const village=ensureVillage(state),fort=village.fortification;
  const built=village.townHallBuilt;
  const trader=(fort.traderClock%180)<75;
  const production=state.productionBuildings||{};
  const units=currentGame.allies||[];
  const postStatus=fort.guardPosts.map((kind,i)=>GUARD_SITES[i].name+': '+(kind==='archer'?'궁수':kind==='soldier'?'병사':'비어 있음')).join(' · ');
  const button=(action,label,cost='',disabled=false)=>'<button class="choice" data-castle="'+action+'" '+(disabled?'disabled':'')+'><span>'+label+'</span><b>'+cost+'</b></button>';
  let html='<p class="panel-note">스트롱홀드 영지 관리 · 건물은 여기서 건설하고 선택한 건물마다 강화할 수 있어. 지도 터치로 자원을 채집해.</p>';
  html+='<h3>🔨 건설 · 시설 업그레이드</h3>';
  html+=button('build:hall',built?'🏛️ 마을회관 완공':'🏛️ 마을회관 건설',built?'건설됨':'나무 12 · 돌 10',built);
  html+=button('build:tower',village.defenseTowerBuilt?'🗼 방어탑 완공':'🗼 방어탑 건설',village.defenseTowerBuilt?'건설됨':'나무 6 · 돌 5',village.defenseTowerBuilt);
  html+=button('building:tower','🗼 방어탑 강화 · '+village.defenseTowerLevel+'/3',village.defenseTowerLevel>=3?'최대':'나무 '+(4+4*village.defenseTowerLevel)+' · 돌 '+(3+5*village.defenseTowerLevel),!village.defenseTowerBuilt||village.defenseTowerLevel>=3);
  html+=button('build:lumber',production.lumberBuilt?'🪓 벌목장 완공':'🪓 벌목장 건설',production.lumberBuilt?'건설됨':'나무 3 · 돌 1',production.lumberBuilt);
  html+=button('building:lumber','🪓 벌목장 강화 · '+(production.lumberLevel||0)+'/3',production.lumberBuilt?'생산량 '+(production.lumberLevel||1)+'배':'건설 필요',!production.lumberBuilt||(production.lumberLevel||1)>=3);
  html+=button('build:mine',production.mineBuilt?'⛏️ 광산 완공':'⛏️ 광산 건설',production.mineBuilt?'건설됨':'나무 2 · 돌 3',production.mineBuilt);
  html+=button('building:mine','⛏️ 광산 강화 · '+(production.mineLevel||0)+'/3',production.mineBuilt?'생산량 '+(production.mineLevel||1)+'배':'건설 필요',!production.mineBuilt||(production.mineLevel||1)>=3);
  html+='<p class="panel-note">상위 성채·병영 성장은 기존 강화 체계와 연결돼. 강화 단계는 저장되고 자원 생산·방어탑 공격에 적용돼.</p>';
  html+='<div class="inventory-grid">'+
    '<div class="item-card">성벽 단계<span>'+fort.wallTier+'/3</span></div>'+
    '<div class="item-card">성문 체력<span>'+Math.ceil(fort.walls.gate)+'</span></div>'+
    '<div class="item-card">상단 성벽<span>'+Math.ceil(fort.walls.north)+'</span></div>'+
    '<div class="item-card">하단 성벽<span>'+Math.ceil(fort.walls.south)+'</span></div></div>';
  html+='<h3>🏰 성벽 · 공성전</h3>';
  if(!built)html+='<p class="panel-note">마을회관을 건설하면 석조 성벽·성문·함정이 해금돼.</p>';
  else{
    const tier=fort.wallTier;
    html+=button('upgrade','돌 성벽 강화'+(tier<3?' → '+(tier+1)+'단계':''),tier<3?('나무 '+(8+tier*6)+' · 돌 '+(8+tier*8)):'최대',tier>=3);
    for(const key of FORT_KEYS)html+=button('repair:'+key,({gate:'성문',north:'북쪽 성벽',south:'남쪽 성벽'})[key]+' 수리',
      '나무 2 · 돌 3',fort.walls[key]>=WALL_BASE[key]+(tier-1)*180);
    html+='<p class="panel-note">적이 성문과 동쪽 성벽을 부수면 돌입해. 파괴된 구간은 수리해야 다시 막을 수 있어.</p>';
  }
  html+='<h3>⏱️ 습격 시간 · 대공성전 설정</h3>';
  html+='<p class="panel-note">습격 주기 '+(fort.raidIntervalSec/60)+'분 · 원본 2분 기본값 유지. 대공성전은 6차 공세, 총 186명 출진, 공성추·공성탑·공병이 포함돼.</p>';
  for(const sec of RAID_TIME_OPTIONS)
    html+=button('timer:'+sec,(sec/60)+'분 간격',sec===fort.raidIntervalSec?'선택됨':'',sec===fort.raidIntervalSec);
  html+='<p class="panel-note">대공성전 자동 발생: '+({off:'끄기',third:'3번째마다',always:'매 습격'})[fort.siegeAuto]+'</p>';
  html+=button('siege:auto:off','대공성전 자동 발생 끄기');
  html+=button('siege:auto:third','3번째 습격마다 대공성전');
  html+=button('siege:auto:always','매 습격을 대공성전으로');
  html+=button('siege:start','대공성전 지금 시작',currentGame.raidActive?'습격 중':'',!built||currentGame.raidActive);
  html+=button('siege:view','성채 전장 중심으로 보기');
  html+='<p class="panel-note">성채 체력 '+Math.ceil(fort.keepHp)+'/'+KEEP_HP+
    ' · 방어 승리 '+fort.siegeVictories+'회 · 함락 '+fort.siegeDefeats+'회</p>';
  if(built&&fort.keepHp<KEEP_HP)html+=button('siege:keep','성채 수리','나무 4 · 돌 6');
  html+='<h3>🎯 부대 진형 · 성채 사기 · 보급</h3>';
  html+='<p class="panel-note">사기 '+Math.floor(fort.morale)+'/100 · 명예 '+fort.honor+' · 식량 '+Math.floor(Number(state.inventory?.food)||0)+' · 현재 명령 '+({hold:'성벽 사수',volley:'일제 사격',counter:'근접 반격'})[fort.defenseOrder]+'. 공성전 중 25초마다 식량 2개를 보급해 사기를 유지해.</p>';
  html+=button('order:hold','🛡️ 성벽 사수 · 기본 진형','','');
  html+=button('order:volley','🏹 일제 사격 · 궁수/방어탑 집중','','');
  html+=button('order:counter','⚔️ 근접 반격 · 검병 공격 강화','','');
  html+=button('siege:rally','🚩 명예로 수비대 재집결','명예 10',fort.honor<10||!currentGame.raidActive);
  html+='<h3>🌊 해자 · 도개교</h3>';
  if(built){
    html+=button('fort:moat','해자 건설 · 공성군 이동 속도 절반',
      fort.moatBuilt?'완성':'나무 12 · 돌 18',fort.moatBuilt);
    html+=button('fort:bridge',fort.drawbridgeClosed?'도개교 열기':'도개교 올리기',
      fort.drawbridgeClosed?'성문 앞 통로 개방':'성문 방어',!fort.moatBuilt);
  }else html+='<p class="panel-note">성채 건설 후 해자와 도개교가 해금돼.</p>';
  html+='<h3>🛡️ 성벽 주둔 병력</h3><p class="panel-note">'+postStatus+'</p>';
  if(built&&state.barracksBuilt)for(let i=0;i<GUARD_SITES.length;i++){
    html+=button('guard:'+i+':archer',GUARD_SITES[i].name+' 궁수 배치','','');
    html+=button('guard:'+i+':soldier',GUARD_SITES[i].name+' 병사 배치','','');
    html+=button('guard:'+i+':none',GUARD_SITES[i].name+' 배치 해제');
  }else html+='<p class="panel-note">주둔 배치는 병영과 마을회관이 필요해.</p>';
  html+='<h3>⚙️ 방어 함정 6종 · 6개 위치</h3>';
  for(let i=0;i<TRAP_SITES.length;i++){
    const trap=fort.traps[i];
    html+='<p class="panel-note">'+(i+1)+'번 지점: '+(trap?(TRAP_TYPES[trap.type]?.name||'함정')+' · 남은 사용 '+trap.charges:'빈 자리')+'</p>';
    if(!built)continue;
    if(trap){
      html+=button('reload:'+i,'함정 재장전','나무 2 · 돌 2',trap.charges>=(TRAP_TYPES[trap.type]?.charges||0));
      html+=button('clear:'+i,'함정 철거');
    }else for(const [type,t] of Object.entries(TRAP_TYPES))
      html+=button('trap:'+i+':'+type,t.name,'나무 '+t.wood+' · 돌 '+t.stone);
  }
  html+='<h3>👷 주민 작업 배치</h3><p class="panel-note">농장 '+(Number(state.workers)||0)+'명 · 벌목장 '+(production.lumberWorker||0)+'명 · 광산 '+(production.mineWorker||0)+'명</p>';
  html+=button('worker:lumber','농장 → 벌목장','주민 1명',!production.lumberBuilt||!!production.lumberWorker);
  html+=button('worker:mine','농장 → 광산','주민 1명',!production.mineBuilt||!!production.mineWorker);
  html+=button('worker:farm','작업장 → 농장','되돌리기',!production.lumberWorker&&!production.mineWorker);
  html+='<h3>⚓ 상선 무역 · 실시간 시장</h3>'+marketContent(state,fort);
  html+='<h3>🏘️ 왕국 성장</h3><p class="panel-note">기존 마을회관 성장과 연결해 성벽·성채 외형이 강화돼. 건설·공성·생산·무역은 같은 저장 데이터를 사용해.</p>';
  document.querySelector('#panelBody').innerHTML=html;
  document.querySelector('#panelBody').querySelectorAll('[data-castle]').forEach(b=>b.addEventListener('click',()=>manageCastle(b.dataset.castle)));
}
function manageCastle(action){
  const game=currentGame,state=game?.state;if(!state)return;
  const village=ensureVillage(state),fort=village.fortification,inv=state.inventory||{};
  const parts=action.split(':'),op=parts[0],id=Number(parts[1]);
  if(op==='build'){
    if(parts[1]==='hall')buildTownHall();
    else if(parts[1]==='tower')buildTower();
    else if(parts[1]==='lumber')buildLumberyard();
    else if(parts[1]==='mine')buildMine();
    renderCastle();return;
  }
  if(op==='building'){
    if(parts[1]==='lumber'||parts[1]==='mine')upgradeProduction(parts[1]);
    else if(parts[1]==='tower'&&village.defenseTowerBuilt){
      const level=village.defenseTowerLevel;
      if(level>=3)return;
      const wood=4+4*level,stone=3+5*level;
      if(!canPay(wood,stone))return toast('방어탑 강화 자원 부족');
      spend(wood,stone);village.defenseTowerLevel=level+1;saveState();
    }
    renderCastle();return;
  }
  if(op==='order'){
    const order=parts[1];if(!['hold','volley','counter'].includes(order))return;
    fort.defenseOrder=order;saveState();renderCastle();toast('🛡️ 수비 진형 변경');return;
  }
  if(op==='fort'){
    if(!village.townHallBuilt)return toast('마을회관부터 건설해');
    if(parts[1]==='moat'){
      if(fort.moatBuilt)return;
      if(!canPay(12,18))return toast('해자 건설 자원 부족');
      spend(12,18);fort.moatBuilt=true;
    }else if(parts[1]==='bridge'){
      if(!fort.moatBuilt)return toast('해자를 먼저 건설해');
      fort.drawbridgeClosed=!fort.drawbridgeClosed;
    }else return;
    saveState();renderCastle();return;
  }
  if(op==='timer'){
    const sec=Number(parts[1]);if(!RAID_TIME_OPTIONS.includes(sec))return;
    fort.raidIntervalSec=sec;
    // 타이머는 다음 습격에 즉시 반영되며 기존 진행 시간을 초기화하지 않는다.
    saveState();renderCastle();toast('⏱️ 습격 간격 '+(sec/60)+'분');return;
  }
  if(op==='siege'){
    const command=parts[1];
    if(command==='view'){game.siegeOverview=true;document.querySelector('#panel')?.close();game.centerStrategyView?.();return}
    if(command==='auto'){
      if(!SIEGE_MODES.includes(parts[2]))return;
      fort.siegeAuto=parts[2];saveState();renderCastle();return;
    }
    if(command==='rally'){
      if(fort.honor<10||!game.raidActive)return;
      fort.honor-=10;fort.morale=Math.min(100,fort.morale+22);
      for(const unit of game.allies||[])if(unit.hp>0)unit.hp=Math.min(unit.maxHp||100,unit.hp+22);
      saveState();renderCastle();toast('🚩 수비대 재집결! 사기 회복');return;
    }
    if(command==='start'){
      if(!village.townHallBuilt||game.raidActive)return toast('마을회관을 짓고 습격이 아닐 때 시작할 수 있어');
      fort.siegeRequested=true;saveState();
      document.querySelector('#panel')?.close();
      toast('🚩 대공성전 출진 명령!');return;
    }
    if(command==='keep'){
      if(fort.keepHp>=KEEP_HP)return;
      if(!canPay(4,6))return toast('성채 수리 재료 부족');
      spend(4,6);fort.keepHp=Math.min(KEEP_HP,fort.keepHp+300);
      saveState();renderCastle();return;
    }
    return;
  }
  if(op==='worker'){
    if(parts[1]==='farm')returnWorkerToFarm();
    else assignWorker(parts[1]);
    renderCastle();return;
  }
  if(op==='trade'){
    if(fort.traderClock%180>=75)return toast('상선이 항해 중이야. 입항 후 거래 가능해');
    const buy=parts[1]==='buy'||['wood','stone','food'].includes(parts[1]);
    const all=parts[1]==='all';
    const selling=parts[1]==='sell'||parts[1]?.startsWith('sell')||['fish','crop'].includes(parts[1]);
    const key=parts.length>2?parts[2]:parts[1]?.startsWith('sell')?parts[1].slice(4):parts[1];
    let earned=0,spent=0;
    if(all){
      for(const item of MARKET_GOODS){
        if(!['fish','crop','flower'].includes(item.id))continue;
        const owned=Math.max(0,Math.floor(Number(inv[item.id])||0));
        const n=Math.floor(owned/item.amount);
        if(!n)continue;
        inv[item.id]-=n*item.amount;
        earned+=n*marketQuote(fort,state.day,item,'sell');
        fort.marketPressure[item.id]=Math.max(-.2,fort.marketPressure[item.id]-.03);
      }
      if(!earned)return toast('판매 가능한 생산품이 없어');
      state.coins+=earned;
    }else{
      const item=MARKET_GOODS.find(x=>x.id===key);
      if(!item||(!buy&&!selling))return;
      const quote=marketQuote(fort,state.day,item,buy?'buy':'sell');
      if(buy){
        if(state.coins<quote)return toast('골드가 부족해');
        state.coins-=quote;
        inv[key]=(Number(inv[key])||0)+item.amount;
        spent=quote;
      }else{
        if((Number(inv[key])||0)<item.amount)return toast('판매할 자원이 부족해');
        inv[key]-=item.amount;
        state.coins+=quote;
        earned=quote;
      }
      fort.marketPressure[key]=Math.max(-.2,Math.min(.2,fort.marketPressure[key]+(buy?.035:-.035)));
    }
    saveState();
    toast('⚓ 거래 완료 · '+(earned?'+'+earned:'-'+spent)+'골드');
    if(document.querySelector('#panelTitle')?.textContent==='⚓ 무역 · 경제')renderTrade();
    else renderCastle();
    return;
  }
  if(!village.townHallBuilt)return toast('마을회관을 먼저 건설해');
  if(op==='upgrade'){
    if(fort.wallTier>=3)return;
    const w=8+fort.wallTier*6,s=8+fort.wallTier*8;
    if(!canPay(w,s))return toast('성벽 강화 자원이 부족해');
    spend(w,s);fort.wallTier++;
    for(const key of FORT_KEYS)fort.walls[key]+=180;
  }else if(op==='repair'){
    const key=parts[1],max=WALL_BASE[key]+(fort.wallTier-1)*180;
    if(!FORT_KEYS.includes(key)||fort.walls[key]>=max)return;
    if(!canPay(2,3))return toast('수리 자원이 부족해');
    spend(2,3);fort.walls[key]=Math.min(max,fort.walls[key]+160);
  }else if(op==='trap'){
    const type=parts[2],def=TRAP_TYPES[type];
    if(!def||!TRAP_SITES[id]||fort.traps[id])return;
    if(!canPay(def.wood,def.stone))return toast('함정 자원이 부족해');
    spend(def.wood,def.stone);fort.traps[id]={type,charges:def.charges,cooldown:0};
  }else if(op==='reload'){
    const trap=fort.traps[id],def=TRAP_TYPES[trap?.type];if(!def||trap.charges>=def.charges)return;
    if(!canPay(2,2))return toast('재장전 자원이 부족해');
    spend(2,2);trap.charges=def.charges;trap.cooldown=0;
  }else if(op==='clear'){
    if(!TRAP_SITES[id])return;
    fort.traps[id]=null;
  }else if(op==='guard'){
    if(!state.barracksBuilt)return toast('병영을 먼저 건설해');
    const kind=parts[2];
    if(!GUARD_SITES[id]||!['archer','soldier','none'].includes(kind))return;
    if(kind!=='none'){
      const current=fort.guardPosts.filter((k,i)=>i!==id&&k===kind).length;
      const alive=(game.allies||[]).filter(u=>u.hp>0&&!u.enemy&&u.kind===kind).length;
      if(alive<=current)return toast('배치할 '+(kind==='archer'?'궁수':'병사')+'가 부족해');
    }
    fort.guardPosts[id]=kind==='none'?null:kind;
  }else return;
  saveState();renderCastle();
}
function applyGuardPosts(){
  const game=currentGame;if(!game)return;
  const fort=ensureVillage(game.state).fortification,used=new Set();
  for(const unit of game.allies||[])if(unit)delete unit._fortPost;
  if(!game.state.villageDevelopment.townHallBuilt)return;
  for(let i=0;i<GUARD_SITES.length;i++){
    const kind=fort.guardPosts[i];if(!kind)continue;
    const unit=(game.allies||[]).find(u=>u&&u.hp>0&&!u.enemy&&u.kind===kind&&!used.has(u));
    if(!unit)continue;
    used.add(unit);unit._fortPost=GUARD_SITES[i];
  }
}
function runFortification(dt){
  const game=currentGame;if(!game?.state)return;
  const village=ensureVillage(game.state),fort=village.fortification;
  fort.traderClock=(fort.traderClock+dt)%180;
  applyGuardPosts();
  if(!village.townHallBuilt||!game.raidActive){
    fortSaveCarry=0;return;
  }
  let damaged=false;
  if(game.grandSiege){
    fort.supplyClock+=dt;
    if(fort.supplyClock>=25){
      fort.supplyClock%=25;
      const inv=game.state.inventory||{};
      if((inv.food||0)>=2){inv.food-=2;fort.morale=Math.min(100,fort.morale+4)}
      else{fort.morale=Math.max(0,fort.morale-13);toast('⚠️ 식량 부족 · 수비대 사기 하락')}
      damaged=true;
    }
  }else fort.supplyClock=0;
  const enemies=livingRaidEnemies(),now=performance.now();
  for(const enemy of enemies){
    if(enemy._fortSlowUntil&&now>=enemy._fortSlowUntil){
      if(Number.isFinite(enemy._fortOriginalSpeed))enemy.speed=enemy._fortOriginalSpeed;
      delete enemy._fortOriginalSpeed;delete enemy._fortSlowUntil;
    }
    if(enemy._fortBurnUntil&&now<enemy._fortBurnUntil){
      enemy.hp-=6*dt;damaged=true;
    }
    // 후방 투석기: 성문/성벽을 먼 거리에서 포격하며 탄약은 실제로 감소한다.
    if(game.grandSiege&&enemy.kind==='trebuchet'&&enemy.ammo>0&&enemy.x<1960){
      enemy._fortSiegeTimer=(enemy._fortSiegeTimer||0)+dt;
      if(enemy._fortSiegeTimer>=enemy.siegeCooldown){
        enemy._fortSiegeTimer%=enemy.siegeCooldown;
        const key=['gate','north','south'][Math.floor((8-enemy.ammo)%3)];
        fort.walls[key]=Math.max(0,fort.walls[key]-enemy.siegeDamage);
        enemy.ammo--;damaged=true;
      }
    }
    // 성문/방벽 충돌: 구조물 HP가 있을 동안 공성 병력을 실제로 저지한다.
    // 해자는 후속 적군 이동을 늦추며, 도개교가 내려오면 성문 방향 진입이 가능하다.
    if(enemy._grandSiege)enemy._siegeMoatFactor=fort.moatBuilt&&enemy.x>1390&&
      enemy.x<1590&&enemy.y>280&&enemy.y<970?.5:1;
    if(enemy.hp>0&&!enemy._fortClimbed&&enemy.x<1395&&enemy.x>1310&&enemy.y>280&&enemy.y<960){
      const lane=enemy._siegeLane??enemy.y,key=lane<520?'north':lane>730?'south':'gate';
      if(fort.walls[key]>0&&(key!=='gate'||fort.drawbridgeClosed)){
        enemy.x=Math.max(enemy.x,1350);
        // 사다리 보병/공성탑은 벽 체력을 무시하는 대신 일정 시간 등반해야 한다.
        if(enemy.kind==='ladder'||enemy.kind==='siegeTower'){
          enemy._fortClimbTimer=(enemy._fortClimbTimer||0)+dt;
          if(enemy._fortClimbTimer>=(enemy.kind==='siegeTower'?5.5:3.7)){
            enemy._fortClimbed=true;enemy.x=1285;damaged=true;
          }
        }else if(['ram','sapper','trebuchet'].includes(enemy.kind)){
          enemy._fortSiegeTimer=(enemy._fortSiegeTimer||0)+dt;
          const attackEvery=Number(enemy.siegeCooldown)||1.2;
          if(enemy._fortSiegeTimer>=attackEvery){
            enemy._fortSiegeTimer%=attackEvery;
            const damage=Math.max(10,Number(enemy.siegeDamage)||10);
            fort.walls[key]=Math.max(0,fort.walls[key]-damage);
            damaged=true;
          }
        }
      }
    }
    // 돌파·등반한 유닛이 성채에 도달하면 병종에 상관없이 내성을 깎는다.
    // 성벽 안으로 진입한 공성 병기가 성채를 파괴하면 대공성전 패배 처리.
    if(game.grandSiege&&enemy._grandSiege&&enemy.hp>0&&enemy.x<1160&&enemy.y>890){
      enemy._fortKeepTimer=(enemy._fortKeepTimer||0)+dt;
      if(enemy._fortKeepTimer>=1){
        enemy._fortKeepTimer%=1;
        fort.keepHp=Math.max(0,fort.keepHp-Math.max(8,Number(enemy.siegeDamage)||12));
        fort.morale=Math.max(0,fort.morale-0.4);
        damaged=true;
        if(fort.keepHp===0&&!game.siegeSurrendered){
          game.siegeSurrendered=true;fort.siegeDefeats++;
          toast('🏚️ 공성군이 성채를 함락했어');
        }
      }
    }
  }
  // 함정 사용 횟수는 유한하며, 여러 적에게 같은 발동 피해를 중복 계산하지 않는다.
  for(let i=0;i<fort.traps.length;i++){
    const t=fort.traps[i],site=TRAP_SITES[i];if(!t||t.charges<=0)continue;
    t.cooldown=Math.max(0,(Number(t.cooldown)||0)-dt);
    if(t.cooldown>0)continue;
    const enemy=enemies.find(e=>e.hp>0&&distance(e,site)<78);
    if(!enemy)continue;
    const def=TRAP_TYPES[t.type];if(!def)continue;
    t.charges--;t.cooldown=t.type==='barrel'?3:1.5;
    enemy.hp-=def.damage;
    if(t.type==='barrel')for(const other of enemies)
      if(other!==enemy&&other.hp>0&&distance(other,site)<115)other.hp-=Math.floor(def.damage*.55);
    if(t.type==='log')enemy.x+=85;
    if(t.type==='pit'||t.type==='net'){
      if(!enemy._fortSlowUntil)enemy._fortOriginalSpeed=Number(enemy.speed)||0;
      enemy.speed=Math.min(Number(enemy.speed)||0,t.type==='net'?0:(Number(enemy._fortOriginalSpeed)||0)*.35);
      enemy._fortSlowUntil=now+(t.type==='net'?1800:2600);
    }
    if(t.type==='oil')enemy._fortBurnUntil=now+2600;
    damaged=true;
  }
  // 손상 발생 후 2초마다 모아서 저장하여 프레임별 DB/로컬스토리지 갱신 폭증을 막는다.
  if(damaged)fortSaveCarry=Math.max(.001,fortSaveCarry);
  if(fortSaveCarry>0){
    fortSaveCarry+=dt;
    if(fortSaveCarry>=2){fortSaveCarry=0;saveState();}
  }
}

function bindMovement() {
  const map = {
    ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
    ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right'
  };
  window.addEventListener('keydown', event => {
    const dir = map[event.code];
    if (dir) pressed.add(dir);
  });
  window.addEventListener('keyup', event => {
    const dir = map[event.code];
    if (dir) pressed.delete(dir);
  });
  window.addEventListener('blur', () => pressed.clear());
}

function runExtendedMovement() {
  const now = performance.now();
  const dt = Math.min(.05, Math.max(0, (now - lastMoveTick) / 1000));
  lastMoveTick = now;
  if (!currentGame || document.hidden || activeRuntime?.paused || document.querySelector('dialog[open]')) return;
  const p = currentGame.player;
  if (p.y < VILLAGE.baseY && !(pressed.has('down') && p.y >= VILLAGE.baseY - 8)) return;
  let dx = (pressed.has('right') ? 1 : 0) - (pressed.has('left') ? 1 : 0);
  let dy = (pressed.has('down') ? 1 : 0) - (pressed.has('up') ? 1 : 0);
  if (!dx && !dy) return;
  const mag = Math.hypot(dx, dy) || 1;
  dx /= mag;
  dy /= mag;
  const speed = 185;
  const nx = Math.max(VILLAGE.minX, Math.min(VILLAGE.maxX, p.x + dx * speed * dt));
  const ny = Math.max(VILLAGE.baseY - 5, Math.min(VILLAGE.maxY, p.y + dy * speed * dt));
  if (p.y > 1025 || dy > 0) {
    p.x = nx;
    p.y = ny;
  } else if (p.y > VILLAGE.baseY - 5 && dy < 0) {
    p.y = ny;
  }
}

const rendererProto = IslandRendererV3.prototype;
const originalDraw = rendererProto.draw;
const originalDrawIsland = rendererProto.drawIsland;
const originalDrawObjects = rendererProto.drawObjects;

rendererProto.draw = function drawWithVillage(game) {
  currentGame = game;
  ensureVillage(game.state);
  originalDraw.call(this, game);
  patchPanels();
};

rendererProto.drawIsland = function drawIslandWithVillage(ctx, game) {
  originalDrawIsland.call(this, ctx, game);
  ctx.save();
  ctx.fillStyle = '#f2dfa8';
  this.rr(ctx, 75, 1000, 1330, 190, 68);
  ctx.fill();
  ctx.fillStyle = '#9fd18f';
  this.rr(ctx, 120, 1015, 1240, 145, 52);
  ctx.fill();
  ctx.fillStyle = '#d8c58f';
  ctx.fillRect(585, 1015, 160, 145);
  ctx.fillStyle = '#315748';
  ctx.font = '800 14px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText('확장된 마을', 665, 1148);
  ctx.textAlign = 'start';
  ctx.restore();
};

rendererProto.drawObjects = function drawObjectsWithVillage(ctx, game) {
  originalDrawObjects.call(this, ctx, game);
  const village = ensureVillage(game.state);
  drawDefenseTower(ctx, village.defenseTowerBuilt);
  drawTownHall(ctx, village.townHallBuilt);
  if (towerShot && towerShot.until > performance.now()) {
    ctx.save();
    ctx.strokeStyle = '#f3b33d';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(towerShot.x1, towerShot.y1);
    ctx.lineTo(towerShot.x2, towerShot.y2);
    ctx.stroke();
    ctx.restore();
  }
};

function drawDefenseTower(ctx, built) {
  ctx.save();
  ctx.textAlign = 'center';
  if (!built) {
    ctx.setLineDash([8, 6]);
    ctx.strokeStyle = '#687267';
    ctx.lineWidth = 3;
    ctx.strokeRect(TOWER.x - 52, TOWER.y - 48, 104, 86);
    ctx.setLineDash([]);
    ctx.font = '28px system-ui';
    ctx.fillText('🗼', TOWER.x, TOWER.y + 6);
    ctx.fillStyle = '#315748';
    ctx.font = '700 11px system-ui';
    ctx.fillText('방어탑 건설터 · 나무6 돌5', TOWER.x, TOWER.y + 58);
  } else {
    ctx.fillStyle = '#84715c';
    ctx.fillRect(TOWER.x - 28, TOWER.y - 60, 56, 96);
    ctx.fillStyle = '#5d5144';
    ctx.fillRect(TOWER.x - 42, TOWER.y - 72, 84, 22);
    ctx.font = '30px system-ui';
    ctx.fillText('🏹', TOWER.x, TOWER.y - 52);
    ctx.fillStyle = '#315748';
    ctx.font = '800 11px system-ui';
    ctx.fillText('방어탑 · 자동 공격', TOWER.x, TOWER.y + 55);
  }
  ctx.restore();
}

function drawTownHall(ctx, built) {
  ctx.save();
  ctx.textAlign = 'center';
  if (!built) {
    ctx.setLineDash([8, 6]);
    ctx.strokeStyle = '#687267';
    ctx.lineWidth = 3;
    ctx.strokeRect(TOWN_HALL.x - 78, TOWN_HALL.y - 50, 156, 92);
    ctx.setLineDash([]);
    ctx.font = '31px system-ui';
    ctx.fillText('🏛️', TOWN_HALL.x, TOWN_HALL.y + 7);
    ctx.fillStyle = '#315748';
    ctx.font = '700 11px system-ui';
    ctx.fillText('마을회관 건설터 · 나무12 돌10', TOWN_HALL.x, TOWN_HALL.y + 61);
  } else {
    ctx.fillStyle = '#d6b77f';
    ctx.fillRect(TOWN_HALL.x - 76, TOWN_HALL.y - 35, 152, 76);
    ctx.fillStyle = '#8f6650';
    ctx.beginPath();
    ctx.moveTo(TOWN_HALL.x - 94, TOWN_HALL.y - 35);
    ctx.lineTo(TOWN_HALL.x, TOWN_HALL.y - 88);
    ctx.lineTo(TOWN_HALL.x + 94, TOWN_HALL.y - 35);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#694a38';
    ctx.fillRect(TOWN_HALL.x - 16, TOWN_HALL.y + 3, 32, 38);
    ctx.font = '24px system-ui';
    ctx.fillText('🏛️', TOWN_HALL.x, TOWN_HALL.y - 13);
    ctx.fillStyle = '#315748';
    ctx.font = '800 12px system-ui';
    ctx.fillText('마을회관 · Lv.1', TOWN_HALL.x, TOWN_HALL.y + 61);
  }
  ctx.restore();
}

// 전략 화면은 캐릭터 이동·근접 건설 버튼을 사용하지 않는다.
setupBuildButton();
setInterval(villageTick, 100);
