// Scene binding, combat stats, save slots and a reusable visual-effects emitter.
import {createGenreGameplay} from './vibe-genre-gameplay.mjs';
export function createVibeWorldBridge(THREE,scene,{cellSize=2}={}){
 const objects=new Map(),mat=new Map();
 const colors={campfire:0xf3a249,workbench:0x8b6946,shelter:0x5d806a};
 function sync(snapshot){const alive=new Set();for(const building of snapshot.buildings||[]){
  const id=building.id+':'+building.x+':'+building.z;alive.add(id);if(objects.has(id))continue;
  const dims=building.id==='shelter'?[5,3,5]:building.id==='workbench'?[3,1.3,1.8]:[1.5,.6,1.5];
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(...dims),new THREE.MeshStandardMaterial({color:colors[building.id]||0x999999,roughness:.85}));
  mesh.name='Building_'+id;mesh.position.set(building.x*cellSize+dims[0]/2,dims[1]/2,building.z*cellSize+dims[2]/2);mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);objects.set(id,mesh)
 }
 for(const [id,mesh] of objects)if(!alive.has(id)){scene.remove(mesh);mesh.geometry.dispose();mesh.material.dispose();objects.delete(id)}
 return objects.size}
 return {sync,dispose(){for(const mesh of objects.values()){scene.remove(mesh);mesh.geometry.dispose();mesh.material.dispose()}objects.clear()},get count(){return objects.size}}
}
export function calculateVibeCombatStats(snapshot,{baseAttack=12,baseDefense=5}={}){
 const level=Math.max(0,Math.min(10,snapshot?.upgrades?.sword||0));
 const swordArt=Math.max(0,Math.min(10,snapshot?.arts?.swordArt||0));
 const innerBreath=Math.max(0,Math.min(8,snapshot?.arts?.innerBreath||0));
 const swiftStep=Math.max(0,Math.min(5,snapshot?.arts?.swiftStep||0));
 return {attack:Math.round(baseAttack*(1+.12*level)+swordArt*2),defense:baseDefense,stamina:100+innerBreath*8,dodgeChance:Math.min(.4,.05+swiftStep*.035),equipmentLevel:level}
}
export function createVibeSaveSlots({storage=null,prefix='vibe:game:',gameId='default',maxSlots=3}={}){
 const memory=new Map();const backend=storage||{getItem:key=>memory.get(key)??null,setItem:(key,val)=>memory.set(key,val),removeItem:key=>memory.delete(key)};
 if(!/^[a-zA-Z0-9_-]{1,64}$/.test(gameId))throw Error('Invalid game id');
 const slotKey=slot=>{if(!Number.isInteger(slot)||slot<1||slot>maxSlots)throw Error('Invalid slot');return prefix+gameId+':'+slot};
 return {
  save(slot,gameplay,extra={}){const record={version:1,gameId,savedAt:new Date().toISOString(),state:gameplay.snapshot(),extra};backend.setItem(slotKey(slot),JSON.stringify(record));return record},
  load(slot,gameplay){const raw=backend.getItem(slotKey(slot));if(!raw)return null;let record;try{record=JSON.parse(raw)}catch{return null}if(record?.version!==1||record.gameId!==gameId||!gameplay.restore(record.state))return null;return record},
  list(){return Array.from({length:maxSlots},(_,i)=>{const slot=i+1;try{const raw=backend.getItem(slotKey(slot));const data=raw?JSON.parse(raw):null;return {slot,savedAt:data?.savedAt||null}}catch{return {slot,savedAt:null}}})},
  remove(slot){backend.removeItem(slotKey(slot))}
 }
}
// [메인: VFX] 기존 미리보기와 실제 게임이 같은 점 파티클 풀을 사용한다. 게임 판정·저장에는 접근하지 않는다.
export function createVibeWorldVfx(THREE,scene,{maxParticles=60}={}){
 const limit=Math.max(1,Math.min(240,Math.floor(Number(maxParticles)||60)));
 const positions=new Float32Array(limit*3),colors=new Float32Array(limit*3);
 const geometry=new THREE.BufferGeometry();
 const positionAttribute=new THREE.BufferAttribute(positions,3),colorAttribute=new THREE.BufferAttribute(colors,3);
 geometry.setAttribute('position',positionAttribute);
 geometry.setAttribute('color',colorAttribute);
 geometry.setDrawRange(0,0);
 const material=new THREE.PointsMaterial({size:.23,vertexColors:true,transparent:true,opacity:.93,depthWrite:false,sizeAttenuation:true,blending:THREE.AdditiveBlending});
 const points=new THREE.Points(geometry,material);
 points.frustumCulled=false;
 scene.add(points);
 const pool=Array.from({length:limit},()=>({x:0,y:0,z:0,vx:0,vy:0,vz:0,life:0,total:.55,r:1,g:1,b:1}));
 let active=0,disposed=false;
 // [VFX 3D] 파츠/새 모델 대신 기존 GPU 점 버퍼에서 폭발·불꽃·마법·먼지 표현만 변경한다.
 function burst({type='impact',x=0,y=1,z=0,color=0xffc66a,count=8}={}){
  if(disposed||![x,y,z].every(Number.isFinite))return 0;
  const kind=['impact','explosion','fire','magic','dust'].includes(type)?type:'impact';
  const tint=new THREE.Color(color),n=Math.max(0,Math.min(limit-active,Math.floor(Number(count)||0)));
  for(let i=0;i<n;i++){
   const p=pool[active++],angle=(i+active)*2.39996323;
   const speed=(kind==='explosion'?2.3:kind==='dust'?.65:kind==='fire'?.6:1.1)+(i%5)*.22;
   p.x=x;p.y=y;p.z=z;p.vx=Math.cos(angle)*speed;
   p.vz=Math.sin(angle)*speed;
   p.vy=(kind==='fire'?1.7:kind==='dust'?.15:kind==='magic'?.9:1.1)+(i%4)*.36;
   p.life=p.total=(kind==='fire'?.7:kind==='dust'?.34:.45)+(i%3)*.07;
   p.gravity=kind==='fire'?-1:kind==='magic'?.6:kind==='dust'?2:4;
   p.r=tint.r;p.g=tint.g;p.b=tint.b;
  }
  return n;
 }
 function update(dt){
  if(disposed)return;
  const step=Math.max(0,Math.min(.1,Number(dt)||0));
  let i=0;
  while(i<active){
   const p=pool[i];
   p.life-=step;
   if(p.life<=0){const last=pool[active-1];pool[active-1]=p;pool[i]=last;active--;continue}
   p.x+=p.vx*step;p.y+=p.vy*step;p.z+=p.vz*step;p.vy-=p.gravity*step;
   const fade=Math.max(0,p.life/p.total),j=i*3;
   positions[j]=p.x;positions[j+1]=p.y;positions[j+2]=p.z;
   colors[j]=p.r*fade;colors[j+1]=p.g*fade;colors[j+2]=p.b*fade;
   i++;
  }
  geometry.setDrawRange(0,active);
  positionAttribute.needsUpdate=true;colorAttribute.needsUpdate=true;
 }
 function dispose(){
  if(disposed)return;
  disposed=true;active=0;scene.remove(points);geometry.dispose();material.dispose();
 }
 return {burst,update,dispose,get count(){return active}};
}


// [VFX 2D] 기존 게임 Canvas에 직접 그리는 제한형 파티클/글로우. 저장·게임 판정과 완전 분리.
export function createVibeCanvasVfx({maxParticles=80,reducedMotion=false}={}){
 const limit=Math.max(1,Math.min(240,Math.floor(Number(maxParticles)||80)));
 const pool=Array.from({length:limit},()=>({x:0,y:0,vx:0,vy:0,life:0,total:0,color:'#fff',size:2,gravity:0,glow:false}));
 let active=0,disposed=false,motionReduced=!!reducedMotion;
 const presets={
  impact:{speed:110,life:.32,gravity:120,size:2.8,glow:false},
  explosion:{speed:180,life:.52,gravity:75,size:3.4,glow:true},
  fire:{speed:34,life:.7,gravity:-80,size:2.8,glow:true},
  magic:{speed:95,life:.6,gravity:-15,size:2.5,glow:true},
  dust:{speed:60,life:.38,gravity:90,size:2.5,glow:false}
 };
 function burst(type='impact',{x=0,y=0,color='#ffcf79',count=12}={}){
  if(disposed||!Number.isFinite(x)||!Number.isFinite(y))return 0;
  const p=presets[type]||presets.impact;
  const amount=Math.max(0,Math.min(limit-active,Math.floor(Number(count)||0),motionReduced?4:limit));
  for(let i=0;i<amount;i++){
   const s=pool[active++],angle=(i+active)*2.39996323,speed=p.speed*(.6+(i%5)*.12);
   s.x=x;s.y=y;s.vx=Math.cos(angle)*speed;s.vy=Math.sin(angle)*speed-(type==='fire'?p.speed:.25*p.speed);
   s.life=s.total=p.life*(.8+(i%3)*.12);s.color=color;s.size=p.size;s.gravity=p.gravity;s.glow=p.glow;
  }
  return amount;
 }
 function update(dt){
  if(disposed)return;
  const step=Math.max(0,Math.min(.1,Number(dt)||0));
  let i=0;
  while(i<active){
   const p=pool[i];p.life-=step;
   if(p.life<=0){const last=pool[active-1];pool[active-1]=p;pool[i]=last;active--;continue}
   p.x+=p.vx*step;p.y+=p.vy*step;p.vy+=p.gravity*step;i++;
  }
 }
 function draw(ctx,{offsetX=0,offsetY=0}={}){
  if(disposed||!ctx||!active)return;
  ctx.save();
  for(let i=0;i<active;i++){
   const p=pool[i],fade=Math.max(0,p.life/p.total),size=Math.max(.5,p.size*fade);
   ctx.globalAlpha=fade;ctx.fillStyle=p.color;
   ctx.shadowColor=p.glow?p.color:'transparent';ctx.shadowBlur=p.glow&&!motionReduced?Math.min(14,8+size):0;
   ctx.fillRect(p.x+offsetX-size/2,p.y+offsetY-size/2,size,size);
  }
  ctx.restore();
 }
 function dispose(){disposed=true;active=0}
 return {burst,update,draw,dispose,setReducedMotion(value){motionReduced=!!value},get count(){return active}};
}
