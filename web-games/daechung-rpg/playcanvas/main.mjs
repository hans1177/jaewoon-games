import * as pc from 'playcanvas';

const $=id=>document.getElementById(id);
const canvas=$('app');
const app=new pc.Application(canvas,{graphicsDeviceOptions:{alpha:false,antialias:true}});
app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
app.setCanvasResolution(pc.RESOLUTION_AUTO);
app.start();

app.scene.ambientLight=new pc.Color(.34,.38,.44);
app.scene.exposure=1.12;
app.scene.gammaCorrection=pc.GAMMA_SRGB;

const mat=(r,g,b,metal=0,gloss=.35)=>{
  const m=new pc.StandardMaterial();
  m.diffuse=new pc.Color(r,g,b);m.metalness=metal;m.gloss=gloss;m.update();return m;
};
const M={
 grass:mat(.20,.46,.23,0,.15),stone:mat(.36,.39,.43,0,.28),wood:mat(.35,.20,.10,0,.18),roof:mat(.38,.12,.10,0,.22),
 hero:mat(.15,.35,.78,.12,.5),slime:mat(.16,.65,.30,0,.25),blue:mat(.18,.48,.78,0,.3),boar:mat(.42,.24,.12,0,.18),
 wolf:mat(.35,.39,.46,0,.22),orc:mat(.25,.48,.19,0,.18),redwolf:mat(.55,.17,.15,0,.22),knight:mat(.28,.31,.38,.25,.48),
 demon:mat(.48,.18,.58,.12,.45),snow:mat(.68,.82,.90,0,.2),jungle:mat(.08,.27,.13,0,.16),sand:mat(.48,.35,.19,0,.15)
};
const portalMats=[mat(.24,.60,1,.18,.72),mat(.55,.30,1,.18,.72),mat(.15,.85,.66,.18,.72),mat(1,.48,.22,.18,.72),mat(.92,.25,.64,.18,.72),mat(.66,.75,.95,.18,.72),mat(.32,.95,.35,.18,.72)];

function primitive(name,type,pos,scale,material,parent=app.root){
  const e=new pc.Entity(name);e.addComponent('model',{type});
  parent.addChild(e);e.setLocalPosition(...pos);e.setLocalScale(...scale);
  if(e.model)e.model.material=material;
  return e;
}
function destroyChildren(root){while(root.children.length)root.children[0].destroy()}

const sun=new pc.Entity('Sun');
sun.addComponent('light',{type:'directional',color:new pc.Color(1,.93,.82),intensity:1.4,castShadows:true,shadowBias:.18,shadowDistance:70});
sun.setEulerAngles(48,-35,0);app.root.addChild(sun);

const zoneRoot=new pc.Entity('ZoneRoot');app.root.addChild(zoneRoot);
const actorRoot=new pc.Entity('ActorRoot');app.root.addChild(actorRoot);

const player=primitive('Player','capsule',[0,1.1,8],[1.05,1.05,1.05],M.hero,actorRoot);
const sword=primitive('Sword','box',[.75,1.15,0],[.12,1.2,.18],M.stone,player);sword.setLocalEulerAngles(0,0,-18);

const state={zone:'town',active:false,portalCd:0,attackCd:0,damageCd:0,toastT:0};
const hero={hp:100,maxHp:100,attack:10,speed:7.2,lv:1,xp:0,nextXp:100,gold:0,kills:0};

const camera=new pc.Entity('Camera');camera.addComponent('camera',{clearColor:new pc.Color(.10,.18,.25),fov:58});app.root.addChild(camera);

const ZONES={
  f1:{name:'1번 사냥터',ground:M.grass,reward:[6,3],enemy:['초록 슬라임',35,4,2.9,M.slime,5]},
  f2:{name:'2번 사냥터',ground:M.grass,reward:[9,5],enemy:['파란 슬라임',56,6,3.0,M.blue,5]},
  f3:{name:'3번 사냥터',ground:M.grass,reward:[18,10],enemy:['회색 늑대',136,12,3.5,M.wolf,6]},
  f4:{name:'4번 사냥터',ground:M.sand,reward:[24,14],enemy:['오크',200,15,2.8,M.orc,6]},
  f5:{name:'5번 사냥터',ground:M.stone,reward:[42,25],enemy:['균열 기사',380,24,3.0,M.knight,6]},
  f6:{name:'6번 사냥터',ground:M.stone,reward:[65,38],enemy:['해골 전사',650,32,3.1,M.knight,7]},
  f7:{name:'7번 정글',ground:M.jungle,reward:[125,72],enemy:['정글 호랑이',1250,48,3.8,M.redwolf,7]}
};

let portals=[],enemies=[],returnPortal=null;
function addTree(x,z,material=M.grass){
  const trunk=primitive('TreeTrunk','cylinder',[x,1.4,z],[.7,2.8,.7],M.wood,zoneRoot);
  primitive('TreeTop','sphere',[0,2.8,0],[3.2,3.2,3.2],material,trunk);
}
function addHouse(x,z){
  const h=new pc.Entity('House');zoneRoot.addChild(h);h.setLocalPosition(x,0,z);
  primitive('Body','box',[0,2,0],[7,4,6],M.wood,h);primitive('Roof','box',[0,4.5,0],[8,1.2,7],M.roof,h);primitive('Door','box',[0,1,-3.05],[1.3,2.2,.18],M.stone,h);
}
function addPortal(x,z,id,material,label){
  const base=primitive('Portal-'+label,'cylinder',[x,.22,z],[2.2,.22,2.2],material,zoneRoot);
  const ring=primitive('PortalRing-'+label,'torus',[x,2.0,z],[1.5,1.5,1.5],material,zoneRoot);
  ring.setLocalEulerAngles(90,0,0);base.portalId=id;base.label=label;return base;
}
function buildTown(){
  destroyChildren(zoneRoot);portals=[];enemies=[];returnPortal=null;
  primitive('Ground','box',[0,-.5,0],[72,1,72],M.grass,zoneRoot);
  for(const [x,z] of [[-14,-12],[14,-12],[-14,12],[14,12],[-24,0],[24,0]])addHouse(x,z);
  for(let i=0;i<18;i++){const a=i/18*Math.PI*2,r=29+(i%3);addTree(Math.cos(a)*r,Math.sin(a)*r)}
  const spots=[[-18,-5],[-12,-5],[-6,-5],[0,-5],[6,-5],[12,-5],[18,-5]];
  portals=spots.map((p,i)=>addPortal(p[0],p[1],i+1,portalMats[i],String(i+1)));
  player.setPosition(0,1.1,8);state.zone='town';state.portalCd=.8;
}
function spawnEnemy(i,spec){
  const [name,hp,atk,speed,material]=spec;
  const angle=(i/7)*Math.PI*2+.4,r=10+(i%3)*4;
  const e=primitive(name+'-'+i,'sphere',[Math.cos(angle)*r,.85,Math.sin(angle)*r-8],[1.3,.85,1.3],material,zoneRoot);
  e.enemyName=name;e.hp=hp;e.maxHp=hp;e.attack=atk;e.speed=speed;e.alive=true;e.hitCd=.2+Math.random()*.5;
  enemies.push(e);
}
function buildHunt(id){
  destroyChildren(zoneRoot);portals=[];enemies=[];returnPortal=null;
  const z=ZONES['f'+id];primitive('Ground','box',[0,-.5,0],[76,1,76],z.ground,zoneRoot);
  for(let i=0;i<24;i++){const a=i/24*Math.PI*2,r=26+(i%4)*2; if(id===7)addTree(Math.cos(a)*r,Math.sin(a)*r,M.jungle); else primitive('Rock','box',[Math.cos(a)*r,.5,Math.sin(a)*r],[1.8,.9,1.5],M.stone,zoneRoot)}
  returnPortal=addPortal(0,8,'town',portalMats[0],'귀환');
  for(let i=0;i<z.enemy[5];i++)spawnEnemy(i,z.enemy);
  player.setPosition(0,1.1,13);state.zone='f'+id;state.portalCd=1;
  toast(z.name+' 입장');
}
function enterZone(target){
  if(target==='town'){buildTown();toast('마을로 귀환');return}
  buildHunt(Number(String(target).replace('f','')));
}

function toast(msg){
  const el=$('toast');el.textContent=msg;el.style.opacity='1';state.toastT=1.5;
}
function addXp(v){
  hero.xp+=v;
  while(hero.xp>=hero.nextXp){hero.xp-=hero.nextXp;hero.lv++;hero.nextXp=hero.lv*100;hero.maxHp+=10;hero.hp=hero.maxHp;hero.attack+=10;toast('레벨 '+hero.lv+'! 체력/공격 +10')}
}
function refreshHud(){
  const z=state.zone==='town'?'마을':ZONES[state.zone]?.name||state.zone;
  $('area').textContent=z;$('lv').textContent='Lv.'+hero.lv;$('hp').textContent='HP '+Math.ceil(hero.hp)+'/'+hero.maxHp;
  $('atk').textContent='공격 '+hero.attack;$('gold').textContent=hero.gold+' G';$('xp').textContent='EXP '+hero.xp+'/'+hero.nextXp;
}
function playerDamage(v){
  if(state.damageCd>0)return;state.damageCd=.65;hero.hp=Math.max(0,hero.hp-v);refreshHud();
  if(hero.hp<=0){hero.gold=Math.max(0,hero.gold-Math.ceil(hero.gold*.2));hero.hp=hero.maxHp;enterZone('town');toast('쓰러졌다 · 마을에서 부활')}
}
function killEnemy(e){
  if(!e.alive)return;e.alive=false;e.enabled=false;hero.kills++;
  const z=ZONES[state.zone];if(z){addXp(z.reward[0]);hero.gold+=z.reward[1]};refreshHud();
}

const keys=new Set();addEventListener('keydown',e=>keys.add(e.key.toLowerCase()));addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
const joy={x:0,y:0,id:null},joyEl=$('joy'),knob=$('knob');
function applyJoy(x,y){const r=joyEl.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;let dx=x-cx,dy=y-cy,l=Math.hypot(dx,dy),m=42;if(l>m){dx=dx/l*m;dy=dy/l*m}joy.x=dx/m;joy.y=dy/m;knob.style.transform=`translate(${dx}px,${dy}px)`}
function stopJoy(){joy.id=null;joy.x=joy.y=0;knob.style.transform='translate(0,0)'}
joyEl.addEventListener('pointerdown',e=>{e.preventDefault();joy.id=e.pointerId;try{joyEl.setPointerCapture(e.pointerId)}catch{}applyJoy(e.clientX,e.clientY)},{passive:false});
joyEl.addEventListener('pointermove',e=>{if(e.pointerId!==joy.id)return;e.preventDefault();applyJoy(e.clientX,e.clientY)},{passive:false});
joyEl.addEventListener('pointerup',e=>{if(e.pointerId===joy.id)stopJoy()},{passive:false});joyEl.addEventListener('pointercancel',stopJoy);

$('startBtn').onclick=()=>{state.active=true;$('start').remove();refreshHud()};
$('attack').onpointerdown=e=>{
  e.preventDefault();if(!state.active||state.attackCd>0)return;state.attackCd=.42;sword.setLocalEulerAngles(0,0,-80);
  const pp=player.getPosition();let target=null,bd=3.3;
  for(const m of enemies){if(!m.alive)continue;const d=m.getPosition().distance(pp);if(d<bd){bd=d;target=m}}
  if(target){target.hp-=hero.attack;target.setLocalScale(1.55,.65,1.55);setTimeout(()=>{if(target.alive)target.setLocalScale(1.3,.85,1.3)},100);if(target.hp<=0)killEnemy(target)}
  setTimeout(()=>sword.setLocalEulerAngles(0,0,-18),150);
};

function updatePortals(){
  if(state.portalCd>0)return;
  const pp=player.getPosition();
  if(state.zone==='town'){
    for(const p of portals)if(p.getPosition().distance(pp)<2.6){enterZone('f'+p.portalId);return}
  }else if(returnPortal&&returnPortal.getPosition().distance(pp)<2.6){enterZone('town')}
}
function updateEnemies(dt){
  if(state.zone==='town')return;
  const pp=player.getPosition();
  for(const m of enemies){
    if(!m.alive)continue;m.hitCd=Math.max(0,m.hitCd-dt);
    const mp=m.getPosition(),dx=pp.x-mp.x,dz=pp.z-mp.z,d=Math.hypot(dx,dz);
    if(d<10&&d>1.8){m.translate((dx/d)*m.speed*dt,0,(dz/d)*m.speed*dt)}
    if(d<=1.9&&m.hitCd<=0){m.hitCd=.9;playerDamage(m.attack)}
  }
}
function clampPlayer(){
  const p=player.getPosition();player.setPosition(Math.max(-34,Math.min(34,p.x)),1.1,Math.max(-34,Math.min(34,p.z)));
}

buildTown();refreshHud();

app.on('update',dt=>{
  state.attackCd=Math.max(0,state.attackCd-dt);state.damageCd=Math.max(0,state.damageCd-dt);state.portalCd=Math.max(0,state.portalCd-dt);
  if(state.toastT>0){state.toastT-=dt;if(state.toastT<=0)$('toast').style.opacity='0'}
  if(state.active){
    let x=joy.x+(keys.has('a')?-1:0)+(keys.has('d')?1:0),z=joy.y+(keys.has('w')?-1:0)+(keys.has('s')?1:0),l=Math.hypot(x,z);
    if(l>1){x/=l;z/=l}
    if(Math.hypot(x,z)>.05){player.translate(x*hero.speed*dt,0,z*hero.speed*dt);player.setEulerAngles(0,Math.atan2(x,z)*180/Math.PI,0)}
    clampPlayer();updatePortals();updateEnemies(dt);
  }
  for(const p of portals)p.rotate(0,55*dt,0);if(returnPortal)returnPortal.rotate(0,55*dt,0);
  const pp=player.getPosition(),desired=new pc.Vec3(pp.x,10,pp.z+14);
  camera.setPosition(camera.getPosition().lerp(camera.getPosition(),desired,Math.min(1,dt*6)));camera.lookAt(pp.x,1.2,pp.z-1.2);
});
addEventListener('resize',()=>app.resizeCanvas());
