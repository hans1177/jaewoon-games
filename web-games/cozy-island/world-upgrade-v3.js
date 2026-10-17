import { JaewoonVibeRuntime } from '../../assets/vibe-runtime.js';
import { IslandRendererV3 } from './render-v3.js';

const EAST_GATE={x:1325,y:600,cost:60};
const JUNGLE_GATE={x:2170,y:1005,cost:100};
const HOSPITAL={x:1215,y:300,cost:50,cooldownMs:60000};
const TOWN_HALL_HALF={wood:6,stone:5};
const KNIGHT_MAX=3;
const JUNGLE={x1:1435,x2:2795,y1:1120,y2:2000};
const BIG_TREE_RESPAWN_MS=45000;
const BIG_TREES=[{x:1580,y:1320},{x:1880,y:1810},{x:2220,y:1420},{x:2510,y:1880},{x:2740,y:1540}];
const boars=[makeBoar(1,1650,1530),makeBoar(2,2050,1870),makeBoar(3,2420,1490),makeBoar(4,2690,1810)];

let currentGame=null,activeRuntime=null,pendingEastBoost=false,lastTick=performance.now(),lastUi=0;
let lastTap={time:0,x:0,y:0},lastDoubleHandledAt=0,selectedBoarId=null,lastWolfTargetId=null;
const originalLoadProgress=JaewoonVibeRuntime.prototype.loadProgress;
const originalQueueSaveProgress=JaewoonVibeRuntime.prototype.queueSaveProgress;

function ensureState(state){
  if(!state||typeof state!=='object')return null;
  let jungle=state.southernJungle;
  if(!jungle||typeof jungle!=='object')jungle=state.southernJungle={};
  if(!jungle.__v3Ready){
    jungle.unlocked=Boolean(jungle.unlocked);
    const old=Array.isArray(jungle.treeReadyAt)?jungle.treeReadyAt:[];
    jungle.treeReadyAt=BIG_TREES.map((_,i)=>Math.max(0,Number(old[i])||0));
    Object.defineProperty(jungle,'__v3Ready',{value:true,enumerable:false,configurable:true});
  }
  state.hospitalCooldownUntil=Math.max(0,Number(state.hospitalCooldownUntil)||0);
  return jungle;
}
JaewoonVibeRuntime.prototype.loadProgress=function(fallback={}){const state=originalLoadProgress.call(this,fallback);activeRuntime=this;ensureState(state);return state;};
JaewoonVibeRuntime.prototype.queueSaveProgress=function(state,delay){activeRuntime=this;ensureState(state);return originalQueueSaveProgress.call(this,state,delay);};

function save(){if(currentGame?.state)activeRuntime?.queueSaveProgress(currentGame.state);}
function toast(message){const el=document.querySelector('#toast');if(!el)return;el.textContent=message;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),2000);}
function distance(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}
function livingTroops(){return(currentGame?.allies||[]).filter(u=>u&&u.hp>0&&['soldier','archer','knight'].includes(u.kind));}
function livingSoldiers(){return livingTroops().filter(u=>u.kind==='soldier');}
function activeWolf(){return currentGame?.wolves?.find(w=>w.id===currentGame.selectedWolfId&&w.alive&&w.hp>0)||null;}
function makeBoar(id,x,y){return{id,x,y,homeX:x,homeY:y,hp:300,maxHp:300,attack:20,speed:66,cool:0,alive:true,respawnAt:0,wander:0,vx:0,vy:0};}
function visible(game,x,y,w,h,margin=150){const l=game.player.x-innerWidth/2-margin,r=game.player.x+innerWidth/2+margin,t=game.player.y-innerHeight/2-margin,b=game.player.y+innerHeight/2+margin;return x+w>=l&&x<=r&&y+h>=t&&y<=b;}

function setupJungleUnlockButton(){
  if(document.querySelector('#jungleUnlockButton'))return;
  const button=document.createElement('button');button.id='jungleUnlockButton';button.type='button';button.textContent='🌴 남쪽 정글 해금 · 100골드';
  button.style.cssText='position:absolute;left:50%;bottom:315px;transform:translateX(-50%);z-index:11;border:0;border-radius:14px;padding:10px 14px;background:rgba(255,255,255,.96);box-shadow:0 4px 14px rgba(31,69,57,.22);font-weight:900;color:#25423a;display:none;touch-action:manipulation;';
  button.addEventListener('pointerdown',event=>{event.preventDefault();unlockJungle();},{passive:false});document.querySelector('#app')?.appendChild(button);
}
function updateJungleUnlockButton(){const button=document.querySelector('#jungleUnlockButton');if(!button||!currentGame)return;const jungle=ensureState(currentGame.state);const show=currentGame.state.expanded&&!jungle.unlocked&&distance(currentGame.player,JUNGLE_GATE)<=145;const next=show?'block':'none';if(button.style.display!==next)button.style.display=next;}
function unlockJungle(){if(!currentGame?.state?.expanded)return toast('먼저 동쪽 지역을 열어야 해');const jungle=ensureState(currentGame.state);if(jungle.unlocked)return;if((Number(currentGame.state.coins)||0)<JUNGLE_GATE.cost)return toast('남쪽 정글 해금에는 100골드가 필요해');currentGame.state.coins-=JUNGLE_GATE.cost;jungle.unlocked=true;currentGame.world.h=2200;save();updateJungleUnlockButton();toast('🌴 남쪽 정글이 열렸어! 큰 나무와 멧돼지가 있어');}
function nearEastGate(){return currentGame&&!currentGame.state.expanded&&distance(currentGame.player,EAST_GATE)<=92;}
function prepareEastDiscount(){if(!nearEastGate()||pendingEastBoost)return{relevant:false,allowCore:true};const coins=Number(currentGame.state.coins)||0;if(coins<EAST_GATE.cost){toast('동쪽 지역 해금에는 60골드가 필요해');return{relevant:true,allowCore:false};}pendingEastBoost=true;currentGame.state.coins=coins+60;setTimeout(()=>{if(currentGame&&!currentGame.state.expanded)currentGame.state.coins=Math.max(0,(Number(currentGame.state.coins)||0)-60);pendingEastBoost=false;},0);return{relevant:true,allowCore:true};}

function nearestBigTree(){if(!currentGame)return null;const jungle=ensureState(currentGame.state);if(!jungle.unlocked)return null;let best=null,bestDistance=96;BIG_TREES.forEach((tree,index)=>{const d=distance(currentGame.player,tree);if(d<bestDistance){best={tree,index};bestDistance=d;}});return best;}
function collectBigTree(){const found=nearestBigTree();if(!found)return false;const jungle=ensureState(currentGame.state),now=Date.now();if(jungle.treeReadyAt[found.index]>now){toast('🌳 이 큰 나무는 다시 자라는 중이야');return true;}currentGame.state.inventory.wood=(Number(currentGame.state.inventory.wood)||0)+3;jungle.treeReadyAt[found.index]=now+BIG_TREE_RESPAWN_MS;save();toast('🌳 큰 정글 나무 · 나무 +3');return true;}
function handleContextAction(){if(!currentGame)return false;const jungle=ensureState(currentGame.state);if(currentGame.state.expanded&&!jungle.unlocked&&distance(currentGame.player,JUNGLE_GATE)<=145){unlockJungle();return true;}return collectBigTree();}
const actionButton=document.querySelector('#actionButton');
actionButton?.addEventListener('pointerdown',event=>{if(handleContextAction()){event.preventDefault();event.stopImmediatePropagation();return;}const east=prepareEastDiscount();if(east.relevant&&!east.allowCore){event.preventDefault();event.stopImmediatePropagation();}},{capture:true,passive:false});
window.addEventListener('keydown',event=>{if(event.code!=='Space'||event.repeat)return;if(handleContextAction()){event.preventDefault();event.stopImmediatePropagation();return;}const east=prepareEastDiscount();if(east.relevant&&!east.allowCore){event.preventDefault();event.stopImmediatePropagation();}},true);

function hospitalCooldownSeconds(){return currentGame?Math.max(0,Math.ceil((Number(currentGame.state.hospitalCooldownUntil)-Date.now())/1000)):0;}
function inCombat(){const raid=(currentGame?.enemies||[]).some(e=>e&&e.hp>0);const boar=boars.find(b=>b.id===selectedBoarId&&b.alive&&b.hp>0);return Boolean(currentGame?.raidActive||raid||activeWolf()||boar||currentGame?.jungleCombatActive);}
function useHospital(){if(!currentGame)return;if((currentGame.enemies||[]).some(e=>e&&e.hp>0)||currentGame.raidActive)return toast('🏥 습격 몬스터가 남아 있어서 치료할 수 없어');if(inCombat())return toast('🏥 전투 중에는 치료할 수 없어');if(!livingSoldiers().length)return toast('🏥 살아있는 병사가 없어서 치료할 수 없어');const cool=hospitalCooldownSeconds();if(cool)return toast(`🏥 치료 쿨타임 ${cool}초 남음`);const wounded=livingTroops().filter(u=>u.hp<u.maxHp);if(!wounded.length)return toast('🏥 이미 모든 병력이 풀피야');if((Number(currentGame.state.coins)||0)<HOSPITAL.cost)return toast('🏥 치료 비용 50골드가 필요해');currentGame.state.coins-=HOSPITAL.cost;for(const unit of wounded)unit.hp=unit.maxHp;currentGame.state.hospitalCooldownUntil=Date.now()+HOSPITAL.cooldownMs;save();toast(`🏥 병력 ${wounded.length}명 풀피 회복 · 50골드`);}

function screenToWorld(sx,sy){if(!currentGame?.player)return null;return{x:sx+currentGame.player.x-innerWidth/2,y:sy+currentGame.player.y-innerHeight/2};}
function handleDoubleAt(sx,sy){
  if(!currentGame)return false;const now=performance.now();if(now-lastDoubleHandledAt<260)return false;const point=screenToWorld(sx,sy);if(!point)return false;
  if(Math.hypot(point.x-HOSPITAL.x,point.y-HOSPITAL.y)<=72){lastDoubleHandledAt=now;useHospital();return true;}
  const jungle=ensureState(currentGame.state);if(!jungle.unlocked||currentGame.raidActive)return false;let best=null,bestDistance=58;
  for(const boar of boars){if(!boar.alive)continue;const d=Math.hypot(point.x-boar.x,point.y-boar.y);if(d<bestDistance){best=boar;bestDistance=d;}}
  if(!best)return false;if(activeWolf()){lastDoubleHandledAt=now;toast('🐺 늑대 전투가 끝난 뒤 멧돼지를 지정할 수 있어');return true;}
  const troops=livingTroops();if(!troops.length){lastDoubleHandledAt=now;toast('🐗 출동할 병력이 없어');return true;}
  selectedBoarId=best.id;currentGame.jungleCombatActive=true;lastDoubleHandledAt=now;for(const unit of troops)unit._fieldMission=true;toast(`🐗 멧돼지 지정! 병사·기사·궁수 ${troops.length}명 출동`);return true;
}
const canvas=document.querySelector('#game');
canvas?.addEventListener('dblclick',event=>{if(handleDoubleAt(event.clientX,event.clientY)){event.preventDefault();event.stopImmediatePropagation();}},true);
canvas?.addEventListener('pointerup',event=>{const now=performance.now();if(now-lastTap.time<360&&Math.hypot(event.clientX-lastTap.x,event.clientY-lastTap.y)<38&&handleDoubleAt(event.clientX,event.clientY)){event.preventDefault();event.stopImmediatePropagation();}lastTap={time:now,x:event.clientX,y:event.clientY};},true);

function moveToward(unit,x,y,dt){const dx=x-unit.x,dy=y-unit.y,d=Math.hypot(dx,dy)||1;unit.x+=dx/d*unit.speed*dt;unit.y+=dy/d*unit.speed*dt;}
function nearestUnit(from,units){let best=null,bestDistance=Infinity;for(const unit of units){if(!unit||unit.hp<=0)continue;const d=Math.hypot(from.x-unit.x,from.y-unit.y);if(d<bestDistance){best=unit;bestDistance=d;}}return best;}
function markMission(){for(const unit of livingTroops()){unit._fieldMission=true;unit._returnHome=false;}}
function beginReturn(){for(const unit of livingTroops()){if(!unit._fieldMission)continue;unit._fieldMission=false;unit._returnHome=true;unit.wander=999;unit.vx=0;unit.vy=0;}}
function returnHome(dt){if(!currentGame||currentGame.raidActive||selectedBoarId!=null||activeWolf())return;for(const unit of livingTroops()){if(!unit._returnHome)continue;unit.wander=999;unit.vx=0;unit.vy=0;const d=Math.hypot(currentGame.barracks.x-unit.x,currentGame.barracks.y-unit.y);if(d<90){unit._returnHome=false;unit.wander=0;continue;}moveToward(unit,currentGame.barracks.x,currentGame.barracks.y,dt);}}
function pruneDeadTroops(){if(!currentGame)return;const arr=currentGame.allies||[],alive=arr.filter(u=>u&&u.hp>0);if(alive.length===arr.length)return;arr.splice(0,arr.length,...alive);currentGame.state.army=alive.map(u=>({kind:u.kind}));currentGame.state.knightCount=alive.filter(u=>u.kind==='knight').length;save();}

function assistWolf(dt){
  if(!currentGame)return;const wolf=activeWolf();
  if(!wolf||currentGame.raidActive||selectedBoarId!=null){if(lastWolfTargetId!=null){beginReturn();lastWolfTargetId=null;}return;}
  if(lastWolfTargetId!==wolf.id){lastWolfTargetId=wolf.id;markMission();toast(`🐺 늑대 지정 · 병사·기사·궁수 ${livingTroops().length}명 출동`);}
  const support=livingTroops().filter(u=>u.kind==='archer'||u.kind==='knight');
  for(const unit of support){unit._fieldMission=true;unit.wander=999;unit.vx=0;unit.vy=0;unit._wolfAssistCool=Math.max(0,Number(unit._wolfAssistCool)||0)-dt;const d=Math.hypot(wolf.x-unit.x,wolf.y-unit.y)||1;if(d>unit.range)moveToward(unit,wolf.x,wolf.y,dt);else if(unit._wolfAssistCool<=0){wolf.hp-=unit.attack;unit._wolfAssistCool=unit.kind==='archer'?1.15:.85;}}
  if(!livingSoldiers().length&&support.length){wolf._supportAttackCool=Math.max(0,Number(wolf._supportAttackCool)||0)-dt;const target=nearestUnit(wolf,support);if(target){const d=Math.hypot(target.x-wolf.x,target.y-wolf.y)||1;if(d>52)moveToward(wolf,target.x,target.y,dt);else if(wolf._supportAttackCool<=0){target.hp-=wolf.attack;wolf._supportAttackCool=.9;pruneDeadTroops();}}}
}

function updateBoars(dt){
  if(!currentGame)return;const jungle=ensureState(currentGame.state);if(!jungle.unlocked)return;const now=Date.now();
  if(currentGame.raidActive){if(selectedBoarId!=null)beginReturn();selectedBoarId=null;currentGame.jungleCombatActive=false;}
  if(activeWolf()&&selectedBoarId!=null){selectedBoarId=null;currentGame.jungleCombatActive=false;}
  for(const boar of boars){
    if(!boar.alive){if(boar.respawnAt&&now>=boar.respawnAt){boar.alive=true;boar.hp=boar.maxHp;boar.x=boar.homeX;boar.y=boar.homeY;boar.respawnAt=0;}continue;}
    boar.cool=Math.max(0,boar.cool-dt);
    if(selectedBoarId!==boar.id||currentGame.raidActive){boar.wander-=dt;if(boar.wander<=0){const a=Math.random()*Math.PI*2;boar.vx=Math.cos(a);boar.vy=Math.sin(a);boar.wander=1.4+Math.random()*2.8;}const nx=boar.x+boar.vx*boar.speed*.22*dt,ny=boar.y+boar.vy*boar.speed*.22*dt;if(nx>JUNGLE.x1+35&&nx<JUNGLE.x2-35)boar.x=nx;else boar.vx*=-1;if(ny>JUNGLE.y1+35&&ny<JUNGLE.y2-35)boar.y=ny;else boar.vy*=-1;continue;}
    const troops=livingTroops();if(!troops.length){selectedBoarId=null;currentGame.jungleCombatActive=false;toast('🐗 전투할 병력이 모두 쓰러졌어');break;}
    currentGame.jungleCombatActive=true;for(const unit of troops){unit._fieldMission=true;unit.wander=999;unit.vx=0;unit.vy=0;unit._boarAssistCool=Math.max(0,Number(unit._boarAssistCool)||0)-dt;const d=Math.hypot(boar.x-unit.x,boar.y-unit.y)||1;if(d>unit.range)moveToward(unit,boar.x,boar.y,dt);else if(unit._boarAssistCool<=0){boar.hp-=unit.attack;unit._boarAssistCool=unit.kind==='archer'?1.15:.85;}}
    const target=nearestUnit(boar,troops);if(target){const d=Math.hypot(target.x-boar.x,target.y-boar.y)||1;if(d>50)moveToward(boar,target.x,target.y,dt);else if(boar.cool<=0){target.hp-=boar.attack;boar.cool=.9;pruneDeadTroops();}}
    if(boar.hp<=0){boar.alive=false;boar.respawnAt=now+60000;selectedBoarId=null;currentGame.jungleCombatActive=false;beginReturn();toast('🐗 멧돼지를 처치했어!');}
  }
  if(selectedBoarId==null&&!activeWolf())currentGame.jungleCombatActive=false;
}

function patchKnightLimit(){if(!currentGame)return;const button=document.querySelector('[data-knight-recruit]');if(!button)return;const count=livingTroops().filter(u=>u.kind==='knight').length,disabled=count>=KNIGHT_MAX;if(button.disabled!==disabled)button.disabled=disabled;const span=button.querySelector('span'),text=`🛡️ 기사 모집 (${count}/${KNIGHT_MAX})`;if(span&&span.textContent!==text)span.textContent=text;}
document.addEventListener('click',event=>{const knight=event.target.closest?.('[data-knight-recruit]');if(knight&&currentGame&&livingTroops().filter(u=>u.kind==='knight').length>=KNIGHT_MAX){event.preventDefault();event.stopImmediatePropagation();toast('🛡️ 기사는 최대 3명이야');return;}const villageButton=event.target.closest?.('#villageBuildButton');if(!villageButton||villageButton.dataset.kind!=='hall'||!currentGame)return;const village=currentGame.state.villageDevelopment||{};if(village.townHallBuilt)return;const inv=currentGame.state.inventory||{},wood=Number(inv.wood)||0,stone=Number(inv.stone)||0;if(wood<TOWN_HALL_HALF.wood||stone<TOWN_HALL_HALF.stone){event.preventDefault();event.stopImmediatePropagation();toast('🏛️ 마을회관 재료 부족 · 나무6 돌5');return;}inv.wood=wood+6;inv.stone=stone+5;},true);

function patchUI(){if(!currentGame)return;patchKnightLimit();updateJungleUnlockButton();const villageButton=document.querySelector('#villageBuildButton');if(villageButton?.dataset.kind==='hall'&&villageButton.textContent!=='🏛️ 마을회관 건설 · 나무6 돌5')villageButton.textContent='🏛️ 마을회관 건설 · 나무6 돌5';const hint=document.querySelector('#hint');if(!hint)return;let text='';if(nearEastGate())text='행동: 동쪽 지역 해금 · 60골드';else{const jungle=ensureState(currentGame.state);if(currentGame.state.expanded&&!jungle.unlocked&&distance(currentGame.player,JUNGLE_GATE)<=150)text='행동: 남쪽 정글 해금 · 100골드';else{const tree=nearestBigTree();if(tree)text=jungle.treeReadyAt[tree.index]<=Date.now()?'행동: 큰 정글 나무 수집 · 나무 +3':'큰 정글 나무가 다시 자라는 중';else if(distance(currentGame.player,HOSPITAL)<=110){const cool=hospitalCooldownSeconds();text=cool?`치유소 더블탭 · 쿨타임 ${cool}초`:'치유소 더블탭 · 치료 50골드';}}}if(text&&hint.textContent!==text)hint.textContent=text;}

const rendererProto=IslandRendererV3.prototype;
const originalDraw=rendererProto.draw,originalDrawIsland=rendererProto.drawIsland,originalDrawObjects=rendererProto.drawObjects;
rendererProto.draw=function drawWorldUpgradeV3(game){currentGame=game;const jungle=ensureState(game.state);if(jungle.unlocked)game.world.h=Math.max(game.world.h,2200);game.boars=boars;game.selectedBoarId=selectedBoarId;originalDraw.call(this,game);};
rendererProto.drawIsland=function drawWorldIslandV3(ctx,game){originalDrawIsland.call(this,ctx,game);if(visible(game,100,700,1300,470))drawLargerVillage(ctx);if(visible(game,1370,980,1490,1120))drawJungleGround(ctx,game);};
rendererProto.drawObjects=function drawWorldObjectsV3(ctx,game){originalDrawObjects.call(this,ctx,game);if(visible(game,900,1080,220,90))drawTownHallCostPatch(ctx,game);if(visible(game,HOSPITAL.x-100,HOSPITAL.y-100,200,200))drawHospitalStatus(ctx,game);if(visible(game,1370,1050,1490,1000))drawJungleObjects(ctx,game);};
function drawLargerVillage(ctx){ctx.save();ctx.strokeStyle='rgba(73,115,78,.48)';ctx.lineWidth=3;ctx.setLineDash([12,8]);ctx.strokeRect(115,720,1230,405);ctx.setLineDash([]);ctx.fillStyle='rgba(230,211,166,.34)';ctx.fillRect(180,890,1080,62);ctx.fillRect(620,745,70,355);ctx.fillStyle='#315748';ctx.font='800 13px system-ui';ctx.fillText('넓어진 마을 구역',150,750);ctx.restore();}
function drawJungleGround(ctx,game){const jungle=ensureState(game.state);ctx.save();ctx.textAlign='center';if(!jungle.unlocked){ctx.fillStyle='#6e826e';ctx.fillRect(1480,1050,1330,18);ctx.font='36px system-ui';ctx.fillText('🔐',JUNGLE_GATE.x,1088);ctx.fillStyle='#315748';ctx.font='800 14px system-ui';ctx.fillText('남쪽 정글 · 100골드',JUNGLE_GATE.x,1115);ctx.restore();return;}ctx.fillStyle='#e5cf92';ctx.beginPath();ctx.roundRect?ctx.roundRect(1390,1060,1450,1020,100):ctx.rect(1390,1060,1450,1020);ctx.fill();ctx.fillStyle='#4f8451';ctx.beginPath();ctx.roundRect?ctx.roundRect(1435,1120,1360,880,78):ctx.rect(1435,1120,1360,880);ctx.fill();ctx.fillStyle='#244d2d';ctx.font='900 18px system-ui';ctx.fillText('남쪽 정글',2140,1160);ctx.restore();}
function drawTownHallCostPatch(ctx,game){if(game.state.villageDevelopment?.townHallBuilt)return;ctx.save();ctx.fillStyle='#9fd18f';ctx.fillRect(900,1138,220,25);ctx.fillStyle='#315748';ctx.font='700 11px system-ui';ctx.textAlign='center';ctx.fillText('마을회관 건설터 · 나무6 돌5',1010,1153);ctx.restore();}
function drawHospitalStatus(ctx,game){ctx.save();ctx.fillStyle='#315748';ctx.font='700 10px system-ui';ctx.textAlign='center';const cool=Math.max(0,Math.ceil((Number(game.state.hospitalCooldownUntil)-Date.now())/1000));ctx.fillText(cool?`더블탭 치료 · ${cool}초`:'더블탭 치료 · 50골드',HOSPITAL.x,HOSPITAL.y+58);ctx.restore();}
function drawJungleObjects(ctx,game){const jungle=ensureState(game.state);if(!jungle.unlocked)return;const now=Date.now();ctx.save();ctx.textAlign='center';for(let i=0;i<BIG_TREES.length;i++){const tree=BIG_TREES[i];if(!visible(game,tree.x-70,tree.y-100,140,180,40))continue;if(jungle.treeReadyAt[i]>now){ctx.fillStyle='#70543a';ctx.fillRect(tree.x-14,tree.y+18,28,22);continue;}ctx.fillStyle='#65472f';ctx.fillRect(tree.x-11,tree.y-5,22,70);ctx.fillStyle='#2f6f3b';ctx.beginPath();ctx.arc(tree.x,tree.y-34,50,0,Math.PI*2);ctx.fill();ctx.fillStyle='#3f8050';ctx.beginPath();ctx.arc(tree.x-30,tree.y-18,34,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(tree.x+30,tree.y-18,34,0,Math.PI*2);ctx.fill();ctx.fillStyle='#173e26';ctx.font='800 11px system-ui';ctx.fillText('큰 나무 · +3',tree.x,tree.y+83);}for(const boar of boars){if(!boar.alive||!visible(game,boar.x-50,boar.y-60,100,120,40))continue;ctx.font='38px system-ui';ctx.fillText('🐗',boar.x,boar.y+12);ctx.fillStyle='rgba(0,0,0,.38)';ctx.fillRect(boar.x-28,boar.y-32,56,6);ctx.fillStyle=selectedBoarId===boar.id?'#f0a43b':'#b64a42';ctx.fillRect(boar.x-28,boar.y-32,56*Math.max(0,boar.hp/boar.maxHp),6);ctx.fillStyle='#54291f';ctx.font='800 11px system-ui';ctx.fillText('멧돼지',boar.x,boar.y+34);}ctx.restore();}

setupJungleUnlockButton();
document.querySelector('#healingCenterButton')?.remove();
function worldTick(){const now=performance.now(),dt=Math.min(.1,Math.max(0,(now-lastTick)/1000));lastTick=now;if(!currentGame||document.hidden||activeRuntime?.paused)return;updateBoars(dt);assistWolf(dt);returnHome(dt);if(now-lastUi>250){lastUi=now;patchUI();}}
setInterval(worldTick,50);
