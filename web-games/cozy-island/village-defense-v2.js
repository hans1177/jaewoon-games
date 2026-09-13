import { JaewoonVibeRuntime } from '../../assets/vibe-runtime.js';
import { IslandRendererV3 } from './render-v3.js';

const TOWER={x:400,y:1090,wood:6,stone:5,radius:115};
const TOWN_HALL={x:1010,y:1090,wood:6,stone:5,radius:125};
const VILLAGE={minX:120,maxX:1360,baseY:1018,maxY:1155};
const TOWER_RANGE=700,TOWER_DAMAGE=18,TOWER_COOLDOWN=1.2;
let currentGame=null,activeRuntime=null,towerTimer=0,lastTick=performance.now(),lastMove=performance.now(),lastUi=0,towerShot=null;
const pressed=new Set();
const originalLoadProgress=JaewoonVibeRuntime.prototype.loadProgress;
const originalQueueSaveProgress=JaewoonVibeRuntime.prototype.queueSaveProgress;

function ensureVillage(s){if(!s||typeof s!=='object')return null;let v=s.villageDevelopment;if(!v||typeof v!=='object')v=s.villageDevelopment={};if(!v._v2){v.defenseTowerBuilt=Boolean(v.defenseTowerBuilt);v.townHallBuilt=Boolean(v.townHallBuilt);Object.defineProperty(v,'_v2',{value:true,enumerable:false});}return v;}
JaewoonVibeRuntime.prototype.loadProgress=function(fallback={}){const s=originalLoadProgress.call(this,fallback);activeRuntime=this;ensureVillage(s);return s;};
JaewoonVibeRuntime.prototype.queueSaveProgress=function(s,delay){activeRuntime=this;ensureVillage(s);return originalQueueSaveProgress.call(this,s,delay);};
function save(){if(currentGame?.state)activeRuntime?.queueSaveProgress(currentGame.state);}
function toast(m){const e=document.querySelector('#toast');if(!e)return;e.textContent=m;e.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.remove('show'),1900);}
function distance(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}

function setupBuildButton(){if(document.querySelector('#villageBuildButton'))return;const b=document.createElement('button');b.id='villageBuildButton';b.type='button';b.style.cssText='position:absolute;left:50%;bottom:260px;transform:translateX(-50%);z-index:10;border:0;border-radius:14px;padding:10px 14px;background:rgba(255,255,255,.96);box-shadow:0 4px 14px rgba(31,69,57,.22);font-weight:900;color:#25423a;display:none;touch-action:manipulation;';b.addEventListener('pointerdown',e=>{e.preventDefault();if(b.dataset.kind==='tower')build('tower');else if(b.dataset.kind==='hall')build('hall');},{passive:false});document.querySelector('#app')?.appendChild(b);}
function updateBuildButton(){const b=document.querySelector('#villageBuildButton');if(!b||!currentGame)return;const v=ensureVillage(currentGame.state),p=currentGame.player;let kind='';if(!v.defenseTowerBuilt&&distance(p,TOWER)<=TOWER.radius)kind='tower';else if(!v.townHallBuilt&&distance(p,TOWN_HALL)<=TOWN_HALL.radius)kind='hall';const d=kind?'block':'none';if(b.style.display!==d)b.style.display=d;if(!kind){b.dataset.kind='';return;}b.dataset.kind=kind;const text=kind==='tower'?'🗼 방어탑 건설 · 나무6 돌5':'🏛️ 마을회관 건설 · 나무6 돌5';if(b.textContent!==text)b.textContent=text;}
function build(kind){if(!currentGame)return;const s=currentGame.state,v=ensureVillage(s),c=kind==='tower'?TOWER:TOWN_HALL,key=kind==='tower'?'defenseTowerBuilt':'townHallBuilt';if(v[key])return;const inv=s.inventory||{};if((Number(inv.wood)||0)<c.wood||(Number(inv.stone)||0)<c.stone)return toast(kind==='tower'?'방어탑 재료 부족 · 나무6 돌5':'마을회관 재료 부족 · 나무6 돌5');inv.wood-=c.wood;inv.stone-=c.stone;v[key]=true;save();updateBuildButton();toast(kind==='tower'?'🗼 방어탑 완성 · 습격 적을 자동 공격해':'🏛️ 마을회관 완성');}
function livingEnemies(){return(currentGame?.enemies||[]).filter(e=>e&&e.hp>0);}
function runTower(dt){if(!currentGame)return;const v=ensureVillage(currentGame.state);if(!v.defenseTowerBuilt||!currentGame.raidActive){towerTimer=0;return;}towerTimer+=dt;if(towerTimer<TOWER_COOLDOWN)return;towerTimer%=TOWER_COOLDOWN;let target=null,best=TOWER_RANGE;for(const e of livingEnemies()){const d=Math.hypot(e.x-TOWER.x,e.y-TOWER.y);if(d<best){best=d;target=e;}}if(!target)return;target.hp-=TOWER_DAMAGE;towerShot={x1:TOWER.x,y1:TOWER.y-55,x2:target.x,y2:target.y,until:performance.now()+180};}
function patchPanel(){if(!currentGame)return;const panel=document.querySelector('#panel'),body=document.querySelector('#panelBody'),title=document.querySelector('#panelTitle')?.textContent;if(!panel?.open||!body||title!=='가방')return;let n=body.querySelector('[data-village-status]');if(!n){n=document.createElement('p');n.className='panel-note';n.dataset.villageStatus='1';body.appendChild(n);}const v=ensureVillage(currentGame.state),text=`마을 시설 · 방어탑 ${v.defenseTowerBuilt?'완성':'미건설'} · 마을회관 ${v.townHallBuilt?'완성':'미건설'} · 마을 확장됨`;if(n.textContent!==text)n.textContent=text;}

const keyMap={ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right'};
window.addEventListener('keydown',e=>{const d=keyMap[e.code];if(d)pressed.add(d);});window.addEventListener('keyup',e=>{const d=keyMap[e.code];if(d)pressed.delete(d);});window.addEventListener('blur',()=>pressed.clear());
function runVillageExtension(dt){if(!currentGame||document.hidden||activeRuntime?.paused||document.querySelector('dialog[open]'))return;const p=currentGame.player;
  // 정글/동쪽에서는 절대 이 이동 보정이 개입하지 않는다.
  if(p.x>VILLAGE.maxX+5||p.y>VILLAGE.maxY+5)return;
  if(p.y<VILLAGE.baseY&&!(pressed.has('down')&&p.y>=VILLAGE.baseY-8))return;
  let dx=(pressed.has('right')?1:0)-(pressed.has('left')?1:0),dy=(pressed.has('down')?1:0)-(pressed.has('up')?1:0);if(!dx&&!dy)return;const m=Math.hypot(dx,dy)||1;dx/=m;dy/=m;const speed=185,nx=Math.max(VILLAGE.minX,Math.min(VILLAGE.maxX,p.x+dx*speed*dt)),ny=Math.max(VILLAGE.baseY-5,Math.min(VILLAGE.maxY,p.y+dy*speed*dt));if(p.y>1025||dy>0){p.x=nx;p.y=ny;}else if(p.y>VILLAGE.baseY-5&&dy<0)p.y=ny;}

const rp=IslandRendererV3.prototype,originalDraw=rp.draw,originalDrawIsland=rp.drawIsland,originalDrawObjects=rp.drawObjects;
rp.draw=function(game){currentGame=game;ensureVillage(game.state);originalDraw.call(this,game);};
rp.drawIsland=function(ctx,game){originalDrawIsland.call(this,ctx,game);ctx.save();ctx.fillStyle='#f2dfa8';this.rr(ctx,75,1000,1330,190,68);ctx.fill();ctx.fillStyle='#9fd18f';this.rr(ctx,120,1015,1240,145,52);ctx.fill();ctx.fillStyle='#d8c58f';ctx.fillRect(585,1015,160,145);ctx.fillStyle='#315748';ctx.font='800 14px system-ui';ctx.textAlign='center';ctx.fillText('확장된 마을',665,1148);ctx.restore();};
rp.drawObjects=function(ctx,game){originalDrawObjects.call(this,ctx,game);const v=ensureVillage(game.state);drawTower(ctx,v.defenseTowerBuilt);drawHall(ctx,v.townHallBuilt);if(towerShot&&towerShot.until>performance.now()){ctx.save();ctx.strokeStyle='#f3b33d';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(towerShot.x1,towerShot.y1);ctx.lineTo(towerShot.x2,towerShot.y2);ctx.stroke();ctx.restore();}};
function drawTower(ctx,built){ctx.save();ctx.textAlign='center';if(!built){ctx.setLineDash([8,6]);ctx.strokeStyle='#687267';ctx.lineWidth=3;ctx.strokeRect(TOWER.x-52,TOWER.y-48,104,86);ctx.setLineDash([]);ctx.font='28px system-ui';ctx.fillText('🗼',TOWER.x,TOWER.y+6);ctx.fillStyle='#315748';ctx.font='700 11px system-ui';ctx.fillText('방어탑 건설터 · 나무6 돌5',TOWER.x,TOWER.y+58);}else{ctx.fillStyle='#84715c';ctx.fillRect(TOWER.x-28,TOWER.y-60,56,96);ctx.fillStyle='#5d5144';ctx.fillRect(TOWER.x-42,TOWER.y-72,84,22);ctx.font='30px system-ui';ctx.fillText('🏹',TOWER.x,TOWER.y-52);ctx.fillStyle='#315748';ctx.font='800 11px system-ui';ctx.fillText('방어탑 · 자동 공격',TOWER.x,TOWER.y+55);}ctx.restore();}
function drawHall(ctx,built){ctx.save();ctx.textAlign='center';if(!built){ctx.setLineDash([8,6]);ctx.strokeStyle='#687267';ctx.lineWidth=3;ctx.strokeRect(TOWN_HALL.x-78,TOWN_HALL.y-50,156,92);ctx.setLineDash([]);ctx.font='31px system-ui';ctx.fillText('🏛️',TOWN_HALL.x,TOWN_HALL.y+7);ctx.fillStyle='#315748';ctx.font='700 11px system-ui';ctx.fillText('마을회관 건설터 · 나무6 돌5',TOWN_HALL.x,TOWN_HALL.y+61);}else{ctx.fillStyle='#d6b77f';ctx.fillRect(TOWN_HALL.x-76,TOWN_HALL.y-35,152,76);ctx.fillStyle='#8f6650';ctx.beginPath();ctx.moveTo(TOWN_HALL.x-94,TOWN_HALL.y-35);ctx.lineTo(TOWN_HALL.x,TOWN_HALL.y-88);ctx.lineTo(TOWN_HALL.x+94,TOWN_HALL.y-35);ctx.closePath();ctx.fill();ctx.fillStyle='#694a38';ctx.fillRect(TOWN_HALL.x-16,TOWN_HALL.y+3,32,38);ctx.font='24px system-ui';ctx.fillText('🏛️',TOWN_HALL.x,TOWN_HALL.y-13);ctx.fillStyle='#315748';ctx.font='800 12px system-ui';ctx.fillText('마을회관 · Lv.1',TOWN_HALL.x,TOWN_HALL.y+61);}ctx.restore();}

setupBuildButton();
setInterval(()=>{const n=performance.now(),dt=Math.min(1,Math.max(0,(n-lastTick)/1000));lastTick=n;if(!document.hidden&&!activeRuntime?.paused)runTower(dt);if(n-lastUi>250){lastUi=n;updateBuildButton();patchPanel();}},100);
setInterval(()=>{const n=performance.now(),dt=Math.min(.08,Math.max(0,(n-lastMove)/1000));lastMove=n;runVillageExtension(dt);},33);
