// Wild Forest: true WebGL three-dimensional scene driven by the existing survival state.
// Gameplay, save, combat, animal AI, crafting, and world coordinates remain authoritative in index.html.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { attachWildNativeScenery } from './wild-native-scenery.mjs';

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
  const root=groupAt(parent),m=mat[type]||mat.boar;
  const body=groupAt(root);
  const bodyLength=type==='rabbit'?.62:1.1;
  mesh(body,geom.ball,m,0,.77,0,.57,.53,bodyLength);
  mesh(body,geom.ball,m,0,.88,-.79,.42,.40,.48);
  for(const x of [-.36,.36])for(const z of [-.63,.56]){
    mesh(body,geom.cylinder,m,x,.32,z,.12,.54,.12);
  }
  for(const x of [-.19,.19]){
    mesh(body,geom.ball,mat.eye,x,1.01,-1.1,.07,.07,.07);
  }
  if(type==='rabbit'){
    root.scale.setScalar(.58);
    for(const x of [-.25,.25])mesh(body,geom.cone,m,x,1.55,-.76,.19,.98,.16);
  }else if(type==='deer'){
    const antler=material('#b89c76');
    for(const x of [-.25,.25]){
      const horn=mesh(body,geom.cylinder,antler,x,1.6,-.78,.05,1.3,.05);
      horn.rotation.z=x>0?-.27:.27;
      const prong=mesh(body,geom.cylinder,antler,x*1.8,1.7,-.74,.04,.59,.04);
      prong.rotation.z=x>0?-.8:.8;
    }
    root.scale.setScalar(1.08);
  }else{
    for(const x of [-.37,.37]){
      const tusk=mesh(body,geom.cone,mat.tusk,x,.57,-1.21,.16,.41,.15);
      tusk.rotation.z=x>0?-.35:.35;
    }
    root.scale.setScalar(1.22);
  }
  return {root,body};
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
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,matchMedia('(pointer:coarse)').matches?1.15:1.6));
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.setSize(innerWidth,innerHeight,false);
  const scene=new THREE.Scene();
  scene.background=new THREE.Color('#8daec1');
  scene.fog=new THREE.FogExp2('#8daec1',.015);
  const camera=new THREE.PerspectiveCamera(58,innerWidth/innerHeight,.1,150);
  const hemi=new THREE.HemisphereLight('#e3f1ff','#63714a',2);
  scene.add(hemi);
  const sun=new THREE.DirectionalLight('#ffe0b0',2.4);
  sun.position.set(-15,29,-10);
  sun.castShadow=true;
  const shadowSize=matchMedia('(pointer:coarse)').matches?1024:2048;
  sun.shadow.mapSize.set(shadowSize,shadowSize);
  sun.shadow.camera.left=-23;sun.shadow.camera.right=23;
  sun.shadow.camera.top=23;sun.shadow.camera.bottom=-23;
  sun.shadow.camera.near=1;sun.shadow.camera.far=65;
  sun.shadow.bias=-0.00032;
  sun.shadow.normalBias=.045;
  scene.add(sun,sun.target);
  const world=groupAt(scene);
  // Vertex-tinted genuine 3D terrain; this is not a flat 2D scene.
  const ground=mesh(world,new THREE.PlaneGeometry(WORLD.w/SCALE,WORLD.h/SCALE,48,38),mat.ground,
    WORLD.w/(2*SCALE),-.06,WORLD.h/(2*SCALE));
  ground.rotation.x=-Math.PI/2;
  const groundPos=ground.geometry.attributes.position,groundColors=[];
  const earthy=new THREE.Color('#67855c'),mossy=new THREE.Color('#406a46');
  for(let i=0;i<groundPos.count;i++){
    const x=groundPos.getX(i),y=groundPos.getY(i);
    const patch=(Math.sin(x*1.3+Math.cos(y*.74))*Math.cos(y*1.74+x*.37)+1)*.5;
    const c=mossy.clone().lerp(earthy,.24+patch*.48);
    groundColors.push(c.r,c.g,c.b);
  }
  ground.geometry.setAttribute('color',new THREE.Float32BufferAttribute(groundColors,3));
  ground.material=material('#ffffff',{vertexColors:true});
  ground.receiveShadow=true;
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
  const human=makeHuman(world);
  const tent=makeTent(world);
  const fire=makeFire(world);
  // Checked-in licensed 3D assets replace toy geometry when source files resolve.
  let nativeForest=null;
  document.body.dataset.nativeForestAssets='loading';
  attachWildNativeScenery({THREE,world,WORLD,SCALE,resources,props,tent})
    .then(value=>{nativeForest=value;})
    .catch(error=>{
      document.body.dataset.nativeForestAssets='unavailable';
      console.error('Original CC0 forest asset loading failed',error);
    });
  human.root.traverse(object=>{if(object.isMesh)object.castShadow=true;});
  for(const item of wildlife)item.root.traverse(object=>{if(object.isMesh)object.castShadow=true;});
  const strike=groupAt(human.root);
  const weaponGlow=mesh(strike,geom.cone,material('#f7eac0',{emissive:'#f5cc6b',emissiveIntensity:.4}),
    -.78,1.54,-.75,.06,1.15,.06);
  weaponGlow.rotation.x=Math.PI/2;
  strike.visible=false;
  const rain=groupAt(scene);
  const drops=[];
  const rainMat=new THREE.MeshBasicMaterial({color:'#b3d7e7',transparent:true,opacity:.53,depthWrite:false});
  const rainGeo=new THREE.CylinderGeometry(.009,.009,.64,3);
  for(let i=0;i<95;i++)drops.push(mesh(rain,rainGeo,rainMat,0,0,0));
  const skyDay=new THREE.Color('#9fbfc7'),skyNight=new THREE.Color('#17283f');
  function pyLight(){return 25;}
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
        root.traverse(part=>{if(part.isMesh)part.castShadow=true;});
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
      it.root.visible=!dead;
      it.root.position.set(animal.x/SCALE,0,animal.y/SCALE);
      const vx=Number(animal.vx)||0,vy=Number(animal.vy)||0;
      if(Math.abs(vx)+Math.abs(vy)>.05)it.root.rotation.y=Math.atan2(-vx,-vy);
      if(!dead)it.body.position.y=Math.sin(now*.005+i)*.04;
    });
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
    if(nativeForest)nativeForest.update(S.camp);
    tent.scale.setScalar(S.camp.shelter>=2?1.28:1);
    fire.root.position.set(S.camp.x/SCALE,0,S.camp.y/SCALE);
    fire.root.visible=!!S.camp.fire;
    fire.flames.scale.y=1+Math.sin(now*.015)*.20;
    fire.light.intensity=S.camp.fire?9+Math.sin(now*.02)*2:0;
    // Perspective camera follows the authoritative player location.
    const px=p.x/SCALE,pz=p.y/SCALE;
    // Third-person cinematic view: more visible depth, less distant top-down toy feel.
    camera.position.lerp(new THREE.Vector3(px+4.2,8.3,pz+12.7),frames<2?1:.10);
    camera.lookAt(px,1.85,pz-4.25);
    sun.position.set(px-15,pyLight(),pz-10);
    sun.target.position.set(px,0,pz);
    sun.target.updateMatrixWorld();
    const hour=S.time/60;
    const sunlight=Math.max(.07,Math.sin((hour-5)/24*Math.PI*2));
    hemi.intensity=.35+sunlight*1.85;
    sun.intensity=.15+sunlight*2.35;
    sun.color.set(S.weather==='storm'?'#c2cbe1':hour<7||hour>17?'#ffba7a':'#ffe5c3');
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
    bindMovement(fn){if(typeof fn==='function')keysInput=fn;},
    get frameCount(){return frames;}
  };
}
