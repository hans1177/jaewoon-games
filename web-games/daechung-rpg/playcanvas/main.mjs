import * as pc from 'playcanvas';

const canvas=document.getElementById('app');
const app=new pc.Application(canvas,{graphicsDeviceOptions:{alpha:false,antialias:true}});
app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
app.setCanvasResolution(pc.RESOLUTION_AUTO);
app.start();

app.scene.ambientLight=new pc.Color(0.34,0.38,0.44);
app.scene.exposure=1.15;
app.scene.gammaCorrection=pc.GAMMA_SRGB;

const mat=(r,g,b,metal=.0,gloss=.35)=>{
  const m=new pc.StandardMaterial();
  m.diffuse=new pc.Color(r,g,b);m.metalness=metal;m.gloss=gloss;m.update();return m;
};
const groundMat=mat(.20,.46,.23,0,.15),stoneMat=mat(.36,.39,.43,0,.28),woodMat=mat(.35,.20,.10,0,.18),roofMat=mat(.38,.12,.10,0,.22),heroMat=mat(.15,.35,.78,.12,.5),enemyMat=mat(.58,.18,.16,.04,.3);
const portalMats=[mat(.24,.60,1,.18,.72),mat(.55,.30,1,.18,.72),mat(.15,.85,.66,.18,.72),mat(1,.48,.22,.18,.72),mat(.92,.25,.64,.18,.72),mat(.66,.75,.95,.18,.72),mat(.32,.95,.35,.18,.72)];

function primitive(name,type,pos,scale,material,parent=app.root){
  const e=new pc.Entity(name);e.addComponent('model',{type});e.setPosition(...pos);e.setLocalScale(...scale);
  if(e.model?.material!==undefined)e.model.material=material;
  parent.addChild(e);return e;
}
primitive('Ground','box',[0,-.5,0],[70,1,70],groundMat);

const sun=new pc.Entity('Sun');
sun.addComponent('light',{type:'directional',color:new pc.Color(1,.93,.82),intensity:1.4,castShadows:true,shadowBias:.18,shadowDistance:55});
sun.setEulerAngles(48,-35,0);app.root.addChild(sun);

for(const [x,z] of [[-14,-12],[14,-12],[-14,12],[14,12],[-24,0],[24,0]]){
  const house=new pc.Entity('House');
  app.root.addChild(house);house.setPosition(x,0,z);
  primitive('Body','box',[0,2,0],[7,4,6],woodMat,house);
  primitive('Roof','box',[0,4.5,0],[8,1.2,7],roofMat,house);
  primitive('Door','box',[0,1,-3.05],[1.3,2.2,.18],stoneMat,house);
}
for(let i=0;i<16;i++){
  const a=i/16*Math.PI*2,r=29+(i%3);
  const trunk=primitive('TreeTrunk','cylinder',[Math.cos(a)*r,1.4,Math.sin(a)*r],[.7,2.8,.7],woodMat);
  primitive('TreeTop','sphere',[trunk.getPosition().x,4,trunk.getPosition().z],[3.2,3.2,3.2],groundMat);
}

const player=primitive('Player','capsule',[0,1.1,8],[1.05,1.05,1.05],heroMat);
player.hp=100;player.attack=10;player.speed=7.2;

const sword=primitive('Sword','box',[.75,1.15,0],[.12,1.2,.18],stoneMat,player);
sword.setLocalEulerAngles(0,0,-18);

const camera=new pc.Entity('Camera');
camera.addComponent('camera',{clearColor:new pc.Color(.10,.18,.25),fov:58});
app.root.addChild(camera);

const portalPositions=[[-18,-5],[-12,-5],[-6,-5],[0,-5],[6,-5],[12,-5],[18,-5]];
const portals=portalPositions.map((p,i)=>{
  const e=primitive('Portal-'+(i+1),'cylinder',[p[0],.22,p[1]],[2.2,.22,2.2],portalMats[i]);
  e.portalId=i+1;return e;
});

const enemies=[];
for(let i=0;i<5;i++){
  const e=primitive('Slime-'+i,'sphere',[-8+i*4,.85,-18-(i%2)*3],[1.3,.85,1.3],enemyMat);
  e.hp=35;e.alive=true;enemies.push(e);
}

const keys=new Set();
addEventListener('keydown',e=>keys.add(e.key.toLowerCase()));
addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));

const joy={x:0,y:0,id:null},joyEl=document.getElementById('joy'),knob=document.getElementById('knob');
function applyJoy(x,y){
  const r=joyEl.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;
  let dx=x-cx,dy=y-cy,l=Math.hypot(dx,dy),m=42;if(l>m){dx=dx/l*m;dy=dy/l*m}
  joy.x=dx/m;joy.y=dy/m;knob.style.transform=`translate(${dx}px,${dy}px)`;
}
function stopJoy(){joy.id=null;joy.x=joy.y=0;knob.style.transform='translate(0,0)'}
joyEl.addEventListener('pointerdown',e=>{e.preventDefault();joy.id=e.pointerId;try{joyEl.setPointerCapture(e.pointerId)}catch{}applyJoy(e.clientX,e.clientY)},{passive:false});
joyEl.addEventListener('pointermove',e=>{if(e.pointerId!==joy.id)return;e.preventDefault();applyJoy(e.clientX,e.clientY)},{passive:false});
joyEl.addEventListener('pointerup',e=>{if(e.pointerId===joy.id)stopJoy()},{passive:false});
joyEl.addEventListener('pointercancel',stopJoy);

let active=false,attackCooldown=0;
document.getElementById('startBtn').onclick=()=>{active=true;document.getElementById('start').remove()};
document.getElementById('attack').onpointerdown=e=>{e.preventDefault();if(attackCooldown>0||!active)return;attackCooldown=.42;sword.setLocalEulerAngles(0,0,-80);
  const pp=player.getPosition();let target=null,bd=3.1;
  for(const e of enemies){if(!e.alive)continue;const d=e.getPosition().distance(pp);if(d<bd){bd=d;target=e}}
  if(target){target.hp-=player.attack;target.setLocalScale(1.55,.65,1.55);setTimeout(()=>{if(target.alive)target.setLocalScale(1.3,.85,1.3)},100);if(target.hp<=0){target.alive=false;target.enabled=false}}
  setTimeout(()=>sword.setLocalEulerAngles(0,0,-18),150);
};

const area=document.getElementById('area');
app.on('update',dt=>{
  attackCooldown=Math.max(0,attackCooldown-dt);
  if(active){
    let x=joy.x+(keys.has('a')?-1:0)+(keys.has('d')?1:0),z=joy.y+(keys.has('w')?-1:0)+(keys.has('s')?1:0);
    const l=Math.hypot(x,z);if(l>1){x/=l;z/=l}
    if(Math.hypot(x,z)>.05){
      const p=player.getPosition();player.setPosition(p.x+x*player.speed*dt,p.y,p.z+z*player.speed*dt);
      player.setEulerAngles(0,Math.atan2(x,z)*180/Math.PI,0);
    }
    const pp=player.getPosition();
    let label='마을';
    for(const p of portals){if(p.getPosition().distance(pp)<2.7){label=p.portalId+'번 포탈 · 3D 이전 준비'}}
    area.textContent=label;
  }
  const pp=player.getPosition();
  const desired=new pc.Vec3(pp.x,9.5,pp.z+13.5);
  camera.setPosition(camera.getPosition().lerp(camera.getPosition(),desired,Math.min(1,dt*6)));
  camera.lookAt(pp.x,1.1,pp.z-1.5);
});

addEventListener('resize',()=>app.resizeCanvas());
