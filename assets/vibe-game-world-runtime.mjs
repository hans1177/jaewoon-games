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
export function createVibeWorldVfx(THREE,scene,{maxParticles=60}={}){
 const particles=[];
 function burst({x=0,y=1,z=0,color=0xffc66a,count=8}={}){
  const n=Math.min(Math.max(0,Math.floor(count)),maxParticles-particles.length);
  for(let i=0;i<n;i++){const mesh=new THREE.Mesh(new THREE.SphereGeometry(.06,6,4),new THREE.MeshBasicMaterial({color,transparent:true,opacity:1}));
   mesh.position.set(x,y,z);const a=i*2.39996;scene.add(mesh);particles.push({mesh,vx:Math.cos(a)*1.5,vy:1+Math.random(),vz:Math.sin(a)*1.5,life:.6})}
 }
 function update(dt){const delta=Math.max(0,Math.min(.1,dt));for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.life-=delta;p.mesh.position.x+=p.vx*delta;p.mesh.position.y+=p.vy*delta;p.mesh.position.z+=p.vz*delta;p.vy-=4*delta;p.mesh.material.opacity=Math.max(0,p.life/.6);if(p.life<=0){scene.remove(p.mesh);p.mesh.geometry.dispose();p.mesh.material.dispose();particles.splice(i,1)}}}
 return {burst,update,dispose(){for(const p of particles){scene.remove(p.mesh);p.mesh.geometry.dispose();p.mesh.material.dispose()}particles.length=0},get count(){return particles.length}}
}
