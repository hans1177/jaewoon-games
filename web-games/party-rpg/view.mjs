// 파일명: web-games/party-rpg/view.mjs
// 임포트: 저장·전투를 변경하지 않는 단일 3D 표현 계층.
import * as THREE from '../../assets/roblox/world-ghosts/native/mesh/three/three.module.js';
import {GLTFLoader} from '../../assets/roblox/world-ghosts/native/mesh/three/examples/jsm/loaders/GLTFLoader.js';
import {clone as cloneRig} from '../../assets/roblox/world-ghosts/native/mesh/three/examples/jsm/utils/SkeletonUtils.js';
const SCALE=1/36;
const HEROES=['warrior','rogue','cleric','wizard','ranger'];
const PROPS=['tree','tree-high','tree-crooked','rock-large','rock-small','rock-wide','wall','wall-wood','wall-door','wall-window-shutters','roof','roof-gable','roof-gable-end','chimney','fountain-round','cart','stall','lantern','pillar-stone','wall-broken','wall-arch','road','fence'];
const MONSTERS=['slime','orc','bunny','golem','ghost','winged'];
export class PartyView{
 constructor(canvas,{onLoad=()=>{}}={}){
  this.canvas=canvas;this.models=new Map();this.actors=new Map();this.staticRoot=new THREE.Group();this.worldSignature='';this.assetRevision=0;
  this.targetYaw=Math.PI/4;this.yaw=this.targetYaw;this.pitch=.73;this.zoom=1;this.targetZoom=1;this.offset=new THREE.Vector2();this.focus=new THREE.Vector3();this.follow='player';this.selection='player';this.destination=null;
  this.raycaster=new THREE.Raycaster();this.pointer=new THREE.Vector2();this.plane=new THREE.Plane(new THREE.Vector3(0,1,0),0);this.hit=new THREE.Vector3();this.lastAt=0;this.frameCost=16;this.quality=1;this.qualityAt=0;this.labels=[];this.lastLabelsAt=0;this.ready=false;
  try{
   this.gl=new THREE.WebGLRenderer({canvas,antialias:false,alpha:false,powerPreference:'high-performance'});this.gl.outputColorSpace=THREE.SRGBColorSpace;this.gl.setClearColor(0x202c25);this.gl.sortObjects=true;
   this.scene=new THREE.Scene();this.scene.fog=new THREE.Fog(0x657265,32,82);this.scene.add(this.staticRoot);
   this.scene.add(new THREE.HemisphereLight(0xdfddc9,0x444631,1.65));const sun=new THREE.DirectionalLight(0xffe5bb,2.1);sun.position.set(-18,35,16);this.scene.add(sun);
   this.camera=new THREE.OrthographicCamera(-12,12,12,-12,.1,180);this.camera.position.set(45,45,45);this.camera.lookAt(0,0,0);
   this.groundMaterials=new Map();this.ringGeometry=new THREE.RingGeometry(.48,.53,32);this.ringMaterials={ally:new THREE.MeshBasicMaterial({color:0x89b37a,side:THREE.DoubleSide,depthWrite:false}),enemy:new THREE.MeshBasicMaterial({color:0xc16c61,side:THREE.DoubleSide,depthWrite:false}),select:new THREE.MeshBasicMaterial({color:0xf0d49c,side:THREE.DoubleSide,depthWrite:false})};
   this.marker=new THREE.Mesh(this.ringGeometry,this.ringMaterials.select);this.marker.rotation.x=-Math.PI/2;this.marker.visible=false;this.scene.add(this.marker);
   this.labelRoot=document.createElement('div');this.labelRoot.id='worldLabels';this.labelRoot.setAttribute('aria-hidden','true');canvas.after(this.labelRoot);
   this.ready=true;this.resize();this.load(onLoad);
  }catch(error){const status=document.getElementById('viewStatus');if(status){status.textContent='3D 화면을 시작하지 못했어. WebGL을 지원하는 브라우저에서 열어 줘.';status.hidden=false;}console.error('파티 RPG 새 렌더러 초기화 실패',error);}
 }
 async load(onLoad){
  const order=[...HEROES,'tree','rock-large','wall','roof','stall','fountain-round',...MONSTERS,...PROPS.filter(k=>!['tree','rock-large','wall','roof','stall','fountain-round'].includes(k))];let completed=0,next=0;const loader=new GLTFLoader();
  const worker=async()=>{while(next<order.length){const key=order[next++];try{
   const model=await loader.loadAsync(new URL('../../assets/shared/party/'+key+'.glb',import.meta.url).href);model.scene.updateMatrixWorld(true);
   model.scene.traverse(part=>{if(!part.isMesh)return;part.frustumCulled=true;part.castShadow=false;part.receiveShadow=false;for(const m of Array.isArray(part.material)?part.material:[part.material]){m.roughness=1;m.metalness=0;if(m.color)m.color.multiplyScalar(.9);if(m.map){m.map.anisotropy=1;m.map.generateMipmaps=true;}}});
   this.models.set(key,model);this.assetRevision++;
  }catch(error){console.warn('새 파티 RPG 자산 적재 실패: '+key,error);}completed++;onLoad(completed,order.length,this.models.has('warrior'));}};
  await Promise.all([worker(),worker(),worker()]);
 }
 resize(){
  this.width=Math.max(1,innerWidth);this.height=Math.max(1,innerHeight);if(!this.gl)return;
  this.mobile=navigator.maxTouchPoints>0||this.width<900;this.gl.setPixelRatio(Math.min(devicePixelRatio||1,this.mobile?1.15:1.5)*this.quality);this.gl.setSize(this.width,this.height,false);
  const span=this.height/(this.mobile?40:45);this.camera.left=-span*this.width/this.height/2;this.camera.right=-this.camera.left;this.camera.top=span/2;this.camera.bottom=-span/2;this.camera.updateProjectionMatrix();
 }
 direction(x,y){const length=Math.min(1,Math.hypot(x,y)),a=Math.cos(this.yaw)*x+Math.sin(this.yaw)*y/Math.sin(this.pitch),b=-Math.sin(this.yaw)*x+Math.cos(this.yaw)*y/Math.sin(this.pitch),d=Math.hypot(a,b)||1;return{x:a/d*length,y:b/d*length};}
 screenToWorld(x,y){if(!this.ready)return null;const b=this.canvas.getBoundingClientRect();this.pointer.set((x-b.left)/b.width*2-1,1-(y-b.top)/b.height*2);this.raycaster.setFromCamera(this.pointer,this.camera);return this.raycaster.ray.intersectPlane(this.plane,this.hit)?{x:this.hit.x/SCALE,y:this.hit.z/SCALE}:null;}
 pick(x,y){if(!this.screenToWorld(x,y))return null;const roots=[...this.actors.values()].map(a=>a.root);for(const hit of this.raycaster.intersectObjects(roots,true)){let o=hit.object;while(o){if(o.userData.live)return o.userData.live;o=o.parent;}}return null;}
 pan(dx,dy){const a=this.screenToWorld(this.width/2,this.height/2),b=this.screenToWorld(this.width/2-dx,this.height/2-dy);if(!a||!b)return;this.offset.x+=b.x-a.x;this.offset.y+=b.y-a.y;this.offset.clamp(new THREE.Vector2(-1500,-1000),new THREE.Vector2(1500,1000));}
 changeZoom(factor){this.targetZoom=THREE.MathUtils.clamp(this.targetZoom*factor,.6,1.9);}
 rotate(){this.targetYaw+=Math.PI/2;}
 center(id='player'){this.follow=id;this.offset.set(0,0);}
 groundMaterial(zone,dungeon){const key=dungeon?'dungeon':String(zone);if(this.groundMaterials.has(key))return this.groundMaterials.get(key);
  const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const c=canvas.getContext('2d');const base=dungeon?'#514f48':['#687354','#7d8355','#4e6248','#505452','#a3916c','#bac5c2','#534d59'][zone]||'#687354';c.fillStyle=base;c.fillRect(0,0,128,128);
  for(let i=0;i<950;i++){const x=(i*73+11)%128,y=(i*47+31)%128;c.globalAlpha=.035+(i%4)*.018;c.fillStyle=i%3?'#172218':'#e2d4ae';c.fillRect(x,y,1+i%4,1+i%3);}c.globalAlpha=1;
  if(dungeon){c.strokeStyle='#353a36';for(let y=0;y<128;y+=32){c.beginPath();c.moveTo(0,y);c.lineTo(128,y);c.stroke();for(let x=(y%64?16:0);x<128;x+=32){c.beginPath();c.moveTo(x,y);c.lineTo(x,y+32);c.stroke();}}}
  const texture=new THREE.CanvasTexture(canvas);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(9,6);texture.anisotropy=1;texture.colorSpace=THREE.SRGBColorSpace;
  const material=new THREE.MeshLambertMaterial({map:texture});this.groundMaterials.set(key,material);return material;
 }
 staticModel(key,x,y,height,rotation=0){const original=this.models.get(key);if(!original)return null;const root=new THREE.Group(),model=original.scene.clone(true),box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3()),scale=height/Math.max(.01,size.y);model.scale.setScalar(scale);model.position.set(-center.x*scale,-box.min.y*scale,-center.z*scale);root.add(model);root.position.set(x*SCALE,.02,y*SCALE);root.rotation.y=rotation;this.staticRoot.add(root);return root;}
 instances(key,placements){const original=this.models.get(key);if(!original||!placements.length)return;original.scene.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(original.scene),center=box.getCenter(new THREE.Vector3()),height=Math.max(.01,box.max.y-box.min.y),local=new THREE.Matrix4();
  original.scene.traverse(part=>{if(!part.isMesh||part.isSkinnedMesh)return;const batch=new THREE.InstancedMesh(part.geometry,part.material,placements.length);for(let i=0;i<placements.length;i++){const p=placements[i],scale=p[2]/height;local.compose(new THREE.Vector3(p[0]*SCALE-center.x*scale,-box.min.y*scale,p[1]*SCALE-center.z*scale),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),p[3]||0),new THREE.Vector3(scale,scale,scale));batch.setMatrixAt(i,local.clone().multiply(part.matrixWorld));}batch.instanceMatrix.needsUpdate=true;this.staticRoot.add(batch);});
 }
 buildWorld(live){
  this.staticRoot.traverse(o=>{if(o.userData.ownedGeometry)o.geometry.dispose();if(o.isInstancedMesh)o.dispose();});this.staticRoot.clear();const w=live.worldW*SCALE,h=live.worldH*SCALE;const floor=new THREE.Mesh(new THREE.PlaneGeometry(w,h),this.groundMaterial(live.state.zone,!!live.dungeon));floor.userData.ownedGeometry=true;floor.rotation.x=-Math.PI/2;floor.position.set(w/2,0,h/2);this.staticRoot.add(floor);this.scene.background=new THREE.Color(live.dungeon?0x242b29:0x657265);
  const random=n=>{const a=Math.sin(n*127.1+live.state.zone*13)*43758.5453;return a-Math.floor(a);};const trees=[],rocks=[];
  for(let i=0;i<(this.mobile?44:70);i++){const x=55+random(i+1)*(live.worldW-110),y=70+random(i+202)*(live.worldH-140);if(Math.abs(x-700)<135||Math.abs(y-500)<105||Math.hypot(x-live.p.x,y-live.p.y)<100)continue;if(live.dungeon||[3,4,6].includes(live.state.zone))rocks.push([x,y,.55+random(i+50)*1.1,i]);else trees.push([x,y,2.0+random(i+33)*1.6,i]);}
  this.instances('tree',trees.filter((_,i)=>i%2===0));this.instances('tree-high',trees.filter((_,i)=>i%2===1));this.instances('rock-large',rocks);
  if(!live.dungeon&&live.state.zone===0){
   for(const [x,y,turn] of [[390,300,0],[1010,300,Math.PI],[700,690,0],[700,815,Math.PI/2]]){
    this.staticModel('wall',x,y,2.4,turn);this.staticModel('wall-wood',x+58,y,2.4,turn);this.staticModel('wall-door',x+18,y+28,2.3,turn);const roof=this.staticModel('roof-gable',x+20,y,1.2,turn);if(roof)roof.position.y=2.35;const chimney=this.staticModel('chimney',x-22,y-24,.9,turn);if(chimney)chimney.position.y=2.7;
   }
   this.staticModel('fountain-round',700,300,1.25);this.staticModel('stall',700,690,2.5);this.staticModel('cart',825,708,1.25);this.instances('lantern',[[500,438,1.65,0],[900,438,1.65,0],[650,750,1.65,0]]);
   this.instances('road',Array.from({length:16},(_,i)=>[700,100+i*50,.12,0]));
  }
  if(live.dungeon){const walls=[];for(let x=50;x<live.worldW;x+=90){walls.push([x,65,2.3,0],[x,live.worldH-40,2.3,0]);}for(let y=140;y<live.worldH-80;y+=90){walls.push([40,y,2.3,Math.PI/2]);if(Math.abs(y-live.worldH/2)>110)walls.push([live.worldW-40,y,2.3,Math.PI/2]);}this.instances('wall-broken',walls);this.instances('pillar-stone',[[100,130,3,0],[live.worldW-110,130,3,0],[100,live.worldH-110,3,0],[live.worldW-110,live.worldH-110,3,0]]);this.staticModel('wall-arch',live.worldW-55,live.worldH/2,3,Math.PI/2);}
 }
 modelRole(kind,obj,live){if(kind==='player')return HEROES[['fighter','rogue','cleric','wizard','ranger'].indexOf(live.state.player.classId)]||'warrior';if(kind==='ai')return HEROES[['fighter','rogue','cleric','wizard','ranger'].indexOf(obj.classId)]||HEROES[(Number(obj.id?.slice(2))||0)%5];const name=obj.name||'';if(/슬라임/.test(name))return'slime';if(/토끼/.test(name))return'bunny';if(/골렘|수호자/.test(name))return'golem';if(/망령/.test(name))return'ghost';if(/박쥐|마수/.test(name))return'winged';return'orc';}
 createActor(role,kind,obj){const original=this.models.get(role);if(!original)return null;const root=new THREE.Group(),model=cloneRig(original.scene),box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());const height=kind==='enemy'?(obj.boss?2.6:obj.elite?2:1.55):1.8,scale=height/Math.max(.01,size.y);model.scale.setScalar(scale);model.position.set(-center.x*scale,-box.min.y*scale,-center.z*scale);model.traverse(p=>{if(p.isMesh){p.material=Array.isArray(p.material)?p.material.map(m=>m.clone()):p.material.clone();}});root.add(model);
  const ring=new THREE.Mesh(this.ringGeometry,this.ringMaterials[kind==='enemy'?'enemy':'ally']);ring.rotation.x=-Math.PI/2;ring.position.y=.04;ring.scale.setScalar(obj.boss?1.7:1);root.add(ring);
  const mixer=new THREE.AnimationMixer(model),actions=new Map();for(const clip of original.animations){const action=mixer.clipAction(clip);actions.set(clip.name,action);}
  const result={root,model,ring,mixer,actions,action:null,role,lastX:obj.x,lastY:obj.y,height};this.scene.add(root);return result;
 }
 animate(entry,moving,combat,dt){let term=combat?.visualUntil>performance.now()?'attack':moving?'walk':'idle';const names=[...entry.actions.keys()];const choose=term==='attack'?names.find(n=>/attack|spell|shoot|punch|bite|headbutt/i.test(n)&&!/idle/i.test(n)):names.find(n=>new RegExp(term,'i').test(n));const name=choose||names.find(n=>/idle/i.test(n))||names[0];if(name&&entry.action!==name){const next=entry.actions.get(name);const previous=entry.actions.get(entry.action);next.reset().setEffectiveWeight(1).play();if(previous)next.crossFadeFrom(previous,.16,true);entry.action=name;}entry.mixer.update(dt);}
 removeActor(key,entry){this.scene.remove(entry.root);entry.mixer.stopAllAction();entry.mixer.uncacheRoot(entry.model);entry.model.traverse(p=>{if(p.isMesh)for(const m of Array.isArray(p.material)?p.material:[p.material])m.dispose();});this.actors.delete(key);}
 render(live){
  if(!this.ready)return;const started=performance.now(),now=started,dt=Math.min(.05,(now-(this.lastAt||now))/1000);this.lastAt=now;
  const signature=live.state.zone+':'+(live.dungeon?live.dungeon.index+':'+live.dungeon.room:'field')+':'+this.assetRevision;
  if(signature!==this.worldSignature){const worldKey=live.state.zone+':'+(live.dungeon?live.dungeon.index+':'+live.dungeon.room:'field');const changed=this.worldKey!==worldKey;this.worldKey=worldKey;if(changed){this.focus.set(live.p.x*SCALE,0,live.p.y*SCALE);this.offset.set(0,0);this.follow='player';}this.worldSignature=signature;this.buildWorld(live);}
  this.yaw+=(this.targetYaw-this.yaw)*(1-Math.exp(-dt*7));this.zoom+=(this.targetZoom-this.zoom)*(1-Math.exp(-dt*9));
  const focus=this.follow==='player'?live.p:live.state.ai.find(a=>a.id===this.follow)||live.p;const goal=new THREE.Vector3((focus.x+this.offset.x)*SCALE,0,(focus.y+this.offset.y)*SCALE);this.focus.lerp(goal,1-Math.exp(-dt*9));const distance=48,span=distance*Math.cos(this.pitch);this.camera.position.set(this.focus.x+Math.sin(this.yaw)*span,distance*Math.sin(this.pitch),this.focus.z+Math.cos(this.yaw)*span);this.camera.lookAt(this.focus);this.camera.zoom=this.zoom;this.camera.updateProjectionMatrix();this.camera.updateMatrixWorld();
  const visible=[['player',live.p,'player']];for(const a of live.state.ai)if(live.dungeon?a.party:a.party||a.zone===live.state.zone)visible.push(['ai',a,a.id]);
  const enemies=live.enemies.filter(e=>!e.dead).sort((a,b)=>(a.x-live.p.x)**2+(a.y-live.p.y)**2-(b.x-live.p.x)**2-(b.y-live.p.y)**2).slice(0,this.mobile?24:44);for(const e of enemies)visible.push(['enemy',e,'enemy'+e.id]);
  const used=new Set();for(const [kind,obj,key] of visible){used.add(key);const role=this.modelRole(kind,obj,live);let entry=this.actors.get(key);if(entry&&entry.role!==role){this.removeActor(key,entry);entry=null;}if(!entry){entry=this.createActor(role,kind,obj);if(!entry)continue;this.actors.set(key,entry);}const dx=obj.x-entry.lastX,dy=obj.y-entry.lastY,moving=Math.hypot(dx,dy)>.08;entry.lastX=obj.x;entry.lastY=obj.y;entry.root.position.set(obj.x*SCALE,.015,obj.y*SCALE);entry.root.userData.live={kind,obj,key};if(moving){const target=Math.atan2(dx,dy),difference=Math.atan2(Math.sin(target-entry.model.rotation.y),Math.cos(target-entry.model.rotation.y));entry.model.rotation.y+=difference*(1-Math.exp(-dt*14));}entry.ring.visible=kind==='player'||key===this.selection||(kind==='ai'&&obj.party);entry.ring.material=key===this.selection?this.ringMaterials.select:this.ringMaterials[kind==='enemy'?'enemy':'ally'];this.animate(entry,moving,live.combat?.(obj),dt);}
  for(const [key,entry] of this.actors)if(!used.has(key))this.removeActor(key,entry);
  this.marker.visible=!!this.destination;if(this.destination)this.marker.position.set(this.destination.x*SCALE,.06,this.destination.y*SCALE);
  this.gl.render(this.scene,this.camera);this.frameCost=this.frameCost*.94+(performance.now()-started)*.06;
  if(now-this.qualityAt>2200){this.qualityAt=now;const q=this.frameCost>24?Math.max(.72,this.quality-.1):this.frameCost<13?Math.min(1,this.quality+.05):this.quality;if(Math.abs(q-this.quality)>.01){this.quality=q;this.resize();}}
  if(now-this.lastLabelsAt>110){this.lastLabelsAt=now;const labels=[];for(const [kind,obj,key] of visible){const entry=this.actors.get(key);if(!entry)continue;const v=new THREE.Vector3(obj.x*SCALE,entry.height+.2,obj.y*SCALE).project(this.camera);if(Math.abs(v.x)>1.1||Math.abs(v.y)>1.1)continue;const hp=kind==='player'?live.state.player:obj;labels.push({key,text:kind==='player'?live.state.player.name||'나':obj.name,x:(v.x+1)*this.width/2,y:(1-v.y)*this.height/2,hp:Math.max(0,Math.min(1,(hp.hp||0)/(hp.maxHp||1))),kind});}
   while(this.labels.length<labels.length){const node=document.createElement('div');node.className='world-label';node.innerHTML='<span></span><i><b></b></i>';this.labelRoot.append(node);this.labels.push(node);}
   this.labels.forEach((node,i)=>{const d=labels[i];node.hidden=!d;if(!d)return;node.style.transform=`translate(${Math.round(d.x)}px,${Math.round(d.y)}px)`;node.dataset.kind=d.kind;node.firstElementChild.textContent=d.text;node.querySelector('b').style.width=(d.hp*100)+'%';});
  }
 }
}
