// Wild Forest: true WebGL three-dimensional scene driven by the existing survival state.
// Gameplay, save, combat, animal AI, crafting, and world coordinates remain authoritative in index.html.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import {clone as cloneSkeleton} from 'three/addons/utils/SkeletonUtils.js';
import {SPECIES} from './wildlife-species.mjs';

const SCALE=72;
const WHITE='#f0ead6';
const COL={
  ground:'#5c7952',wood:'#77533a',foliage:'#3c7346',foliage2:'#4e9153',
  rock:'#829087',grass:'#b2b877',berry:'#aa3642',water:'#4b829c',
  sand:'#b3a680',skin:'#c69b76',shirt:'#435c46',pants:'#383f39',
  deer:'#aa7953',rabbit:'#b6ad9b',boar:'#564339',flame:'#ffa53b'
};
const material=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.84,...extra});
const mat={};
for(const [key,color] of Object.entries(COL))mat[key]=material(color);
mat.water=material(COL.water,{roughness:.22,metalness:.04,transparent:true,opacity:.87});
mat.eye=material('#171915',{roughness:.45});
mat.tusk=material('#eddfc0');
mat.fire=material(COL.flame,{emissive:'#ee711c',emissiveIntensity:2});
const geom={
  box:new THREE.BoxGeometry(1,1,1),
  ball:new THREE.SphereGeometry(1,10,7),
  cylinder:new THREE.CylinderGeometry(1,1,1,8),
  cone:new THREE.ConeGeometry(1,1,7),
  rock:new THREE.DodecahedronGeometry(1,0),
  plane:new THREE.PlaneGeometry(1,1)
};
function mesh(parent,geometry,m,x,y,z,sx=1,sy=1,sz=1){
  const shape=new THREE.Mesh(geometry,m);
  shape.position.set(x,y,z);
  shape.scale.set(sx,sy,sz);
  parent.add(shape);return shape;
}
function groupAt(parent,x=0,y=0,z=0){
  const g=new THREE.Group();g.position.set(x,y,z);parent.add(g);return g;
}
function makeTree(parent,seed){
  const tree=groupAt(parent),variety=.82+(seed%5)*.082;
  mesh(tree,geom.cylinder,mat.wood,0,1.35,0,.25,2.7,.25);
  mesh(tree,geom.cone,mat.foliage,0,3.2,0,1.48,3.5,1.48);
  mesh(tree,geom.cone,mat.foliage2,0,4.30,0,1.01,2.55,1.01);
  mesh(tree,geom.ball,mat.foliage,0,2.86,0,1.1,.75,1.1);
  tree.scale.setScalar(variety);
  return tree;
}
function makeStone(parent,seed){
  const root=groupAt(parent);
  const stone=mesh(root,geom.rock,mat.rock,0,.42,0,.75,.44,.59);
  stone.rotation.set(.1,(seed*2.3)%6,.23);return root;
}
function makeFiber(parent,seed){
  const root=groupAt(parent);
  for(let i=0;i<5;i++){
    const a=i*2.4+seed;
    const blade=mesh(root,geom.cone,mat.grass,Math.cos(a)*.27,.39,Math.sin(a)*.27,.15,.82,.15);
    blade.rotation.z=Math.sin(a)*.28;
  }
  return root;
}
function makeBerry(parent){
  const root=groupAt(parent);
  mesh(root,geom.ball,mat.foliage,0,.73,0,.75,.75,.65);
  for(let i=0;i<7;i++){
    const a=i*2.4,rr=.54;
    mesh(root,geom.ball,mat.berry,Math.cos(a)*rr,.70+Math.sin(i*1.7)*.25,Math.sin(a)*rr,.14,.14,.14);
  }
  return root;
}
function makeHuman(parent){
  const root=groupAt(parent);
  const legs=[];
  for(const x of [-.27,.27]){
    const leg=groupAt(root,x,1.18,0);
    mesh(leg,geom.cylinder,mat.pants,0,-.46,0,.21,.88,.23);
    mesh(leg,geom.box,mat.pants,0,-.91,.12,.4,.2,.6);
    legs.push(leg);
  }
  mesh(root,geom.box,mat.shirt,0,1.95,0,1.05,1.2,.63);
  mesh(root,geom.ball,mat.skin,0,2.79,0,.45,.49,.4);
  for(const x of [-.7,.7])mesh(root,geom.cylinder,mat.shirt,x,1.92,0,.17,1,.2);
  // Eyes are visible from the forward (-Z) side of the actual 3D model.
  for(const x of [-.15,.15])mesh(root,geom.ball,mat.eye,x,2.86,-.375,.054,.055,.045);
  const weapon=groupAt(root,.78,1.65,-.24);
  mesh(weapon,geom.cylinder,mat.wood,0,-.32,0,.09,.9,.09);
  mesh(weapon,geom.cone,mat.tusk,0,-.87,0,.18,.48,.18);
  weapon.rotation.x=-.30;
  return {root,legs,weapon};
}
function makeAnimal(parent,type){
  const spec=SPECIES[type]||SPECIES.boar;
  const root=groupAt(parent);
  const body=groupAt(root);
  const bodyMat=material(spec.color);
  const accent=material(type==='badger'?'#eee4cc':type==='fox'?'#e5bf89':type==='bison'?'#5a4639':'#b6a08a');
  const shoulder=spec.kind==='predator'?'low':'medium';
  const small=['rabbit','squirrel','raccoon','beaver','badger','fox','crow','turkey'].includes(type);
  const bird=['crow','turkey'].includes(type);
  const canine=['wolf','coyote','fox'].includes(type);
  const large=['bear','bison','moose','elk'].includes(type);
  const hoofed=['deer','elk','moose','bison','mountain_goat'].includes(type);
  const legs=[];
  const torsoLength=bird?.73:small?.90:large?1.48:1.25;
  const height=bird?.84:small?.72:large?1.22:1.03;
  mesh(body,geom.ball,bodyMat,0,height,0,large?.78:small?.51:.65,large?.65:.46,torsoLength);
  if(type==='bison'||type==='bear'){
    mesh(body,geom.ball,accent,0,height+.17,-.55,large?.82:.67,.76,.83);
  }
  const head=groupAt(body,0,height+.27,-torsoLength*.8);
  mesh(head,geom.ball,bodyMat,0,.12,-.28,small?.40:.49,small?.40:.46,small?.43:.55);
  mesh(head,geom.ball,accent,0,-.12,-.67,.34,.22,.40);
  for(const x of [-.22,.22]){
    mesh(head,geom.ball,mat.eye,x,.20,-.71,.05,.06,.044);
  }
  const legOffset=large?.51:small?.27:.38;
  for(const x of [-legOffset,legOffset])for(const z of [-torsoLength*.66,torsoLength*.65]){
    const leg=groupAt(body,x,height-.24,z);
    mesh(leg,geom.cylinder,bodyMat,0,-.40,0,large?.19:.13,large?.94:.66,large?.19:.13);
    const foot=mesh(leg,geom.box,hoofed?mat.rock:bodyMat,0,-.86,-.12,large?.35:.26,.24,.48);
    foot.rotation.y=x*.15;legs.push(leg);
  }
  if(bird){
    const wings=[];
    for(const x of [-.62,.62]){
      const wing=groupAt(body,x,height+.12,-.07);
      const feather=mesh(wing,geom.ball,bodyMat,x<0?-.22:.22,-.04,0,.61,.13,.65);
      feather.rotation.z=x<0?-.35:.35;wings.push(wing);
    }
    mesh(head,geom.cone,mat.tusk,0,-.12,-.96,.16,.40,.17).rotation.x=-Math.PI/2;
    if(type==='turkey'){
      for(let i=0;i<7;i++){
        const angle=(i-3)*.30;
        const feather=mesh(body,geom.ball,bodyMat,Math.sin(angle)*.78,height+.16,.95,.19,.75,.13);
        feather.rotation.z=-angle;
      }
    }
    body.userData.wings=wings;
  }else if(hoofed){
    if(type==='deer'||type==='elk'||type==='moose'){
      for(const x of [-.25,.25]){
        const a=mesh(head,geom.cylinder,accent,x,.84,-.12,.09,type==='moose'?.95:.72,.08);
        a.rotation.z=x>0?.31:-.31;
        for(let i=0;i<(type==='deer'?2:4);i++){
          const twig=mesh(head,geom.cylinder,accent,x*(1.6+i*.24),.91+i*.22,-.16,.055,.43,.06);
          twig.rotation.z=x>0?.89:-.89;
        }
      }
    }else{
      for(const x of [-.31,.31]){
        const horn=mesh(head,geom.cone,accent,x,.72,-.32,.15,.72,.15);
        horn.rotation.z=x>0?-.32:.32;
      }
    }
    if(type==='moose')mesh(head,geom.ball,accent,0,-.2,-.90,.40,.31,.52);
  }else if(canine){
    for(const x of [-.31,.31]){
      const ear=mesh(head,geom.cone,bodyMat,x,.62,-.26,.19,.54,.19);
      ear.rotation.z=x>0?-.14:.14;
    }
    const tail=mesh(body,geom.cone,bodyMat,0,height+.07,torsoLength+.5,.32,1.32,.34);
    tail.rotation.x=-.93;
  }else if(type==='rabbit'){
    for(const x of [-.20,.20]){
      const ear=mesh(head,geom.cone,bodyMat,x,1.07,-.2,.19,1.03,.17);
      ear.rotation.z=x>0?-.16:.16;
    }
  }else if(type==='boar'){
    for(const x of [-.30,.30]){
      const tusk=mesh(head,geom.cone,mat.tusk,x,-.13,-.94,.17,.50,.15);
      tusk.rotation.z=x>0?-.35:.35;
    }
  }else if(type==='bear'){
    for(const x of [-.32,.32])mesh(head,geom.ball,bodyMat,x,.45,-.19,.19,.21,.14);
  }else if(type==='beaver'){
    mesh(body,geom.box,bodyMat,0,.30,torsoLength+.52,.44,.16,1.18);
  }else if(type==='squirrel'){
    const tail=mesh(body,geom.ball,bodyMat,0,height+.38,torsoLength+.65,.38,.78,.35);
    tail.rotation.x=.48;
  }else if(type==='raccoon'||type==='badger'){
    const mask=mesh(head,geom.ball,mat.eye,0,.21,-.69,.37,.15,.085);
    mask.rotation.z=type==='badger'?.22:0;
    mesh(body,geom.cylinder,accent,0,height,torsoLength+.32,.2,.88,.2).rotation.x=1.15;
  }
  root.scale.setScalar(spec.scale);
  return {root,body,head,legs,spec,native:null,animations:null};
}
function makeTent(parent){
  const root=groupAt(parent);
  for(const x of [-1.35,1.35])for(const z of [-1,1])
    mesh(root,geom.cylinder,mat.wood,x,1.12,z,.095,2.2,.095);
  const roof=mesh(root,new THREE.ConeGeometry(2.55,1.65,4),mat.wood,0,2.7,0,1,1,.95);
  roof.rotation.y=Math.PI/4;
  mesh(root,geom.box,mat.sand,0,.09,0,2.8,.17,2.2);
  return root;
}
function makeFire(parent){
  const root=groupAt(parent);
  for(let i=0;i<6;i++){
    const a=i*Math.PI/3;
    mesh(root,geom.rock,mat.rock,Math.cos(a)*.48,.19,Math.sin(a)*.48,.27,.22,.25);
  }
  const flames=groupAt(root);
  for(let i=0;i<4;i++){
    const a=i*Math.PI/2;
    const flame=mesh(flames,geom.cone,mat.fire,Math.cos(a)*.17,.82,Math.sin(a)*.17,.18,.92,.18);
    flame.rotation.z=Math.cos(a)*.17;
  }
  const light=new THREE.PointLight('#ffa851',11,10,2);
  light.position.set(0,1.3,0);root.add(light);
  return{root,flames,light};
}
export function createWild3D({canvas,WORLD,resources,animals}){
  if(!canvas||!window.WebGL2RenderingContext)throw new Error('WebGL2 지원 브라우저와 GPU가 필요해.');
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.3;
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,matchMedia('(pointer:coarse)').matches?1.3:1.75));
  renderer.setSize(innerWidth,innerHeight,false);
  const scene=new THREE.Scene();
  scene.background=new THREE.Color('#8daec1');
  scene.fog=new THREE.FogExp2('#8daec1',.015);
  const camera=new THREE.PerspectiveCamera(58,innerWidth/innerHeight,.1,150);
  const hemi=new THREE.HemisphereLight('#e3f1ff','#63714a',2);
  scene.add(hemi);
  const sun=new THREE.DirectionalLight('#ffe0b0',2.4);
  sun.position.set(-15,29,-10);scene.add(sun);
  const world=groupAt(scene);
  const ground=mesh(world,new THREE.PlaneGeometry(WORLD.w/SCALE,WORLD.h/SCALE),mat.ground,
    WORLD.w/(2*SCALE),-.06,WORLD.h/(2*SCALE));
  ground.rotation.x=-Math.PI/2;
  const river=mesh(world,new THREE.PlaneGeometry(WORLD.w/SCALE,WORLD.riverH/SCALE),mat.water,
    WORLD.w/(2*SCALE),.022,(WORLD.riverY+WORLD.riverH/2)/SCALE);
  river.rotation.x=-Math.PI/2;
  for(const y of [WORLD.riverY-8,WORLD.riverY+WORLD.riverH+8]){
    mesh(world,geom.box,mat.sand,WORLD.w/(2*SCALE),.04,y/SCALE,WORLD.w/SCALE,.12,.30);
  }
  // 3D rocky hill from the original 2D region (2850,420).
  const hill=groupAt(world,2850/SCALE,-.02,420/SCALE);
  for(let i=0;i<11;i++){
    const a=i*2.4,rad=i%3;
    const rock=mesh(hill,geom.rock,mat.rock,Math.cos(a)*rad*1.65,1.0,Math.sin(a)*rad*1.4,2.3,.98,1.7);
    rock.rotation.y=a;
  }
  const props=resources.map((r,index)=>{
    const root=groupAt(world,r.x/SCALE,0,r.y/SCALE);
    if(r.type==='tree')makeTree(root,index);
    else if(r.type==='stone')makeStone(root,index);
    else if(r.type==='fiber')makeFiber(root,index);
    else makeBerry(root);
    return root;
  });
  const wildlife=animals.map(a=>{
    const result=makeAnimal(world,a.type);
    result.root.position.set(a.x/SCALE,0,a.y/SCALE);
    return result;
  });
  // Original GLB native wolf rig (shared asset). Only this species claims native GLB loading.
  // Every other species remains genuine species-shaped 3D geometry, never a 2D sprite.
  const wolves=wildlife.filter((it,i)=>animals[i].type==='wolf');
  document.body.dataset.nativeWolfModel=wolves.length?'loading':'not-applicable';
  if(wolves.length){
    const wolfLoader=new GLTFLoader();
    wolfLoader.load(new URL('../../assets/shared/creature-wolf.glb',import.meta.url).href,gltf=>{
      const source=gltf.scene;
      if(!source)return;
      const bbox=new THREE.Box3().setFromObject(source);
      const size=bbox.getSize(new THREE.Vector3());
      if(!Number.isFinite(size.y)||size.y<=.001)throw new Error('Invalid native wolf GLB bounds');
      const factor=1.65/size.y;
      for(const it of wolves){
        const model=cloneSkeleton(source);
        model.scale.setScalar(factor);
        model.position.set(-(bbox.min.x+bbox.max.x)*.5*factor,-bbox.min.y*factor,-(bbox.min.z+bbox.max.z)*.5*factor);
        const holder=groupAt(it.root);
        holder.add(model);it.body.visible=false;it.native=holder;
        if(gltf.animations?.length){
          const mixer=new THREE.AnimationMixer(model);
          const chosen=gltf.animations.find(c=>/walk|run|trot/i.test(c.name))||gltf.animations[0];
          if(chosen)mixer.clipAction(chosen).play();
          it.animations=mixer;
        }
      }
      document.body.dataset.nativeWolfModel='loaded';
      document.body.dataset.nativeWolfCount=String(wolves.length);
    },undefined,err=>{
      document.body.dataset.nativeWolfModel='failed';
      console.warn('Wolf GLB could not load; procedural 3D wolf remains.',err);
    });
  }
  const human=makeHuman(world);
  const tent=makeTent(world);
  const fire=makeFire(world);
  const strike=groupAt(human.root);
  const weaponGlow=mesh(strike,geom.cone,material('#f7eac0',{emissive:'#f5cc6b',emissiveIntensity:.4}),
    -.78,1.54,-.75,.06,1.15,.06);
  weaponGlow.rotation.x=Math.PI/2;
  strike.visible=false;
  // Hunters can temporarily reveal actual 3D footprints in the scene.
  const footprints=groupAt(world);
  const footprintMat=material('#4f4939',{roughness:1});
  let footprintUntil=0;
  function showTrail(animal){
    for(const part of [...footprints.children]){footprints.remove(part);part.geometry.dispose();}
    for(const t of (animal?.trail||[])){
      const mark=mesh(footprints,new THREE.SphereGeometry(1,6,4),footprintMat,t.x/SCALE,.022,t.y/SCALE,.27,.033,.37);
      mark.rotation.y=Math.atan2(animal.vx,animal.vy);
    }
    footprintUntil=performance.now()+7500;
  }
  const rain=groupAt(scene);
  const drops=[];
  const rainMat=new THREE.MeshBasicMaterial({color:'#b3d7e7',transparent:true,opacity:.53,depthWrite:false});
  const rainGeo=new THREE.CylinderGeometry(.009,.009,.64,3);
  for(let i=0;i<95;i++)drops.push(mesh(rain,rainGeo,rainMat,0,0,0));
  const skyDay=new THREE.Color('#9fbfc7'),skyNight=new THREE.Color('#17283f');
  // Fixed third-person, mobile-first shoulder camera. Right-screen drag orbits it.
  let yaw=0, pitch=.29;
  const CAMERA_DISTANCE=8.6;
  const cameraTarget=new THREE.Vector3();
  const cameraGoal=new THREE.Vector3();
  const smoothTarget=new THREE.Vector3();
  const touches=new Map();
  const limit=(v,min,max)=>Math.max(min,Math.min(max,v));
  const forward=()=>({x:-Math.sin(yaw),y:-Math.cos(yaw)});
  function movementVector(right,down){
    const f=forward();
    return {x:-f.y*right-f.x*down,y:f.x*right-f.y*down};
  }
  canvas.addEventListener('pointerdown',e=>{
    if(e.pointerType==='mouse'&&e.button!==0)return;
    touches.set(e.pointerId,{x:e.clientX,y:e.clientY});
    try{canvas.setPointerCapture(e.pointerId)}catch{}
    e.preventDefault();
  },{passive:false});
  canvas.addEventListener('pointermove',e=>{
    const old=touches.get(e.pointerId);
    if(!old)return;
    const dx=e.clientX-old.x,dy=e.clientY-old.y;
    touches.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(touches.size===1){yaw-=limit(dx,-120,120)*.0042;pitch=limit(pitch-limit(dy,-120,120)*.0033,.08,.65);}
    e.preventDefault();
  },{passive:false});
  const releasePointer=e=>touches.delete(e.pointerId);
  canvas.addEventListener('pointerup',releasePointer);
  canvas.addEventListener('pointercancel',releasePointer);
  canvas.addEventListener('lostpointercapture',releasePointer);
  function followThirdPerson(p){
    const px=p.x/SCALE,pz=p.y/SCALE;
    const f=forward(),right={x:-f.y,y:f.x};
    cameraTarget.set(px+f.x*.7,1.7,pz+f.y*.7);
    const horizontal=CAMERA_DISTANCE*Math.cos(pitch);
    cameraGoal.set(px-f.x*horizontal+right.x*.85,1.7+CAMERA_DISTANCE*Math.sin(pitch),pz-f.y*horizontal+right.y*.85);
    // Third-person follow remains in-world: avoid clipping through nearby trunks and rocks.
    const origin=new THREE.Vector3(px,1.8,pz);
    const delta=cameraGoal.clone().sub(origin);
    let allowed=1;
    const length2=delta.lengthSq();
    for(const r of resources){
      if(r.amount<=0||(r.type!=='tree'&&r.type!=='stone'))continue;
      const rx=r.x/SCALE,rz=r.y/SCALE;
      if(Math.abs(rx-px)>12||Math.abs(rz-pz)>12)continue;
      const t=limit(((rx-origin.x)*delta.x+(rz-origin.z)*delta.z)/length2,0,1);
      if(t<=.14||t>=allowed)continue;
      const closest=origin.clone().addScaledVector(delta,t);
      const radius=r.type==='tree'?.52:.4;
      if((closest.x-rx)**2+(closest.z-rz)**2<radius**2&&closest.y<4.4)allowed=Math.min(allowed,Math.max(.2,t-.06));
    }
    if(allowed<1)cameraGoal.copy(origin).lerp(cameraGoal,allowed);
    camera.position.lerp(cameraGoal,frames<2?1:.18);
    smoothTarget.lerp(cameraTarget,frames<2?1:.24);
    camera.lookAt(smoothTarget);
    document.body.dataset.cameraMode='third';
    document.body.dataset.cameraYaw=yaw.toFixed(3);
    document.body.dataset.cameraPitch=pitch.toFixed(3);
  }
  let width=innerWidth,height=innerHeight,frames=0,previous=performance.now();
  let glLost=false;
  canvas.addEventListener('webglcontextlost',e=>{
    e.preventDefault();
    glLost=true;
    document.body.dataset.spatialDimension='3d-error';
    const label=document.getElementById('renderStatus');
    if(label){label.hidden=false;label.textContent='3D 그래픽 연결이 끊어졌어. 새로고침해 줘.';}
  });
  // Optional shared GLB for the same player, with visible 3D geometry if loading fails.
  document.body.dataset.nativeHumanModel='loading';
  try{
    const loader=new GLTFLoader();
    loader.load(new URL('../../assets/shared/humanoid-traveler.glb',import.meta.url).href,
      gltf=>{
        const model=gltf.scene;
        if(!model)return;
        const bounds=new THREE.Box3().setFromObject(model);
        const dimensions=bounds.getSize(new THREE.Vector3());
        if(!Number.isFinite(dimensions.y)||dimensions.y<=.0001)return;
        const scale=2.9/dimensions.y,root=groupAt(human.root);
        model.scale.setScalar(scale);
        model.position.set(-(bounds.min.x+bounds.max.x)*.5*scale,-bounds.min.y*scale,
          -(bounds.min.z+bounds.max.z)*.5*scale);
        root.add(model);
        for(const part of human.root.children)if(part!==root)part.visible=false;
        document.body.dataset.nativeHumanModel='loaded';
      },undefined,err=>{
        document.body.dataset.nativeHumanModel='unavailable';
        console.warn('Native player GLB unavailable; keeping procedural 3D character.',err);
      }
    );
  }catch(e){document.body.dataset.nativeHumanModel='unavailable';}
  function resize(){
    if(innerWidth===width&&innerHeight===height)return;
    width=innerWidth;height=innerHeight;
    renderer.setSize(width,height,false);
    camera.aspect=width/Math.max(1,height);
    camera.updateProjectionMatrix();
  }
  function render(S,now){
    if(glLost)return;
    resize();
    const p=S.player;
    // Read-only position proof for post-deployment keyboard/mobile movement smoke tests.
    document.body.dataset.playerWorldX=Number(p.x).toFixed(2);
    document.body.dataset.playerWorldY=Number(p.y).toFixed(2);
    props.forEach((g,i)=>g.visible=resources[i].amount>0);
    wildlife.forEach((it,i)=>{
      const animal=animals[i],dead=animal.dead>0;
      const dx=animal.x-p.x,dy=animal.y-p.y;
      const nearby=dx*dx+dy*dy<1250*1250;
      it.root.visible=!dead&&nearby;
      if(!it.root.visible)return;
      it.root.position.set(animal.x/SCALE,0,animal.y/SCALE);
      const vx=Number(animal.vx)||0,vy=Number(animal.vy)||0;
      if(Math.abs(vx)+Math.abs(vy)>.05)it.root.rotation.y=Math.atan2(-vx,-vy);
      const gait=(.004+(Number(it.spec.speed)||80)*.00002),phase=now*gait+i*1.7;
      if(it.native){
        it.native.position.y=.04+Math.sin(phase)*.045;
        it.animations?.update(Math.min(.04,(now-previous)/1000||0));
      }else{
        it.body.position.y=Math.sin(phase)*.055;
        it.head.rotation.x=Math.sin(phase*.65)*.065;
        for(let j=0;j<it.legs.length;j++)it.legs[j].rotation.x=Math.sin(phase+(j%2?Math.PI:0))*.26;
        for(const wing of it.body.userData.wings||[])wing.rotation.z=Math.sin(phase)*.28;
      }
    });
    footprints.visible=now<footprintUntil;
    human.root.position.set(p.x/SCALE,0,p.y/SCALE);
    human.root.rotation.y=Math.atan2(-p.faceX,-p.faceY);
    const moving=S.started&&!S.dead&&
      (Math.abs(keysInput())>.01);
    for(let i=0;i<human.legs.length;i++)human.legs[i].rotation.x=moving?
      Math.sin(now*.009+i*Math.PI)*.35:0;
    human.weapon.visible=S.gear.spear||S.gear.axe||S.gear.knife;
    strike.visible=now-p.attackAt<160;
    tent.position.set(S.camp.x/SCALE,0,S.camp.y/SCALE);
    tent.visible=S.camp.shelter>0;
    tent.scale.setScalar(S.camp.shelter>=2?1.28:1);
    fire.root.position.set(S.camp.x/SCALE,0,S.camp.y/SCALE);
    fire.root.visible=!!S.camp.fire;
    fire.flames.scale.y=1+Math.sin(now*.015)*.20;
    fire.light.intensity=S.camp.fire?9+Math.sin(now*.02)*2:0;
    // Fixed third-person shoulder camera follows live authoritative position.
    followThirdPerson(p);
    const px=p.x/SCALE,pz=p.y/SCALE;
    const hour=S.time/60;
    const sunlight=Math.max(.07,Math.sin((hour-5)/24*Math.PI*2));
    hemi.intensity=.35+sunlight*1.85;
    sun.intensity=.08+sunlight*2.35;
    const skyMix=Math.min(1,Math.max(0,sunlight));
    scene.background.copy(skyNight).lerp(skyDay,skyMix);
    scene.fog.color.copy(scene.background);
    scene.fog.density=S.weather==='storm'?.036:S.weather==='rain'?.024:.015;
    const wet=S.weather==='rain'||S.weather==='storm';
    rain.visible=wet;
    if(wet){
      const count=S.weather==='storm'?95:48;
      const elapsed=now*.013;
      for(let i=0;i<drops.length;i++){
        const d=drops[i];
        d.visible=i<count;
        if(!d.visible)continue;
        const ax=(i*3.73%24)-12,az=(i*5.41%30)-15;
        d.position.set(px+ax,(i*1.77-elapsed)%12+12,pz+az);
        d.rotation.z=.16;
      }
    }
    renderer.render(scene,camera);
    if(++frames===1){
      document.body.dataset.spatialDimension='3d';
      document.body.dataset.renderer='three-webgl';
      canvas.dataset.renderedFrame='true';
      const label=document.getElementById('renderStatus');
      if(label)label.hidden=true;
    }
    if(frames%60===0)document.body.dataset.webglFrames=String(frames);
    previous=now;
  }
  // Movement flags are deliberately read-only: simulation still runs in the original game.
  let keysInput=()=>0;
  return{
    render,
    movementVector,
    cameraForward:forward,
    showTrail,
    get cameraMode(){return 'third';},
    bindMovement(fn){if(typeof fn==='function')keysInput=fn;},
    get frameCount(){return frames;}
  };
}
