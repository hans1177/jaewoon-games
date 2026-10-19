// Wild Forest: render actual archived original asset geometry, never synthetic entity stand-ins.
// Existing survival simulation owns position, enemy AI, drops, combat, crafting, and save semantics.
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OBJLoader} from 'three/addons/loaders/OBJLoader.js';
import {MTLLoader} from 'three/addons/loaders/MTLLoader.js';

const SCALE=72;
const ORIGINAL_ASSETS=Object.freeze({
  player:{model:'../../assets/shared/humanoid-traveler-actions.glb',kind:'glb',height:2.9},
  tree:{model:'../../assets/shared/homely-house/tree.obj',mtl:'../../assets/shared/homely-house/tree.mtl',height:4.8},
  treeLarge:{model:'../../assets/shared/homely-house/tree_large.obj',mtl:'../../assets/shared/homely-house/tree_large.mtl',height:5.8},
  fiber:{model:'../../assets/shared/homely-house/foliage_A.obj',mtl:'../../assets/shared/homely-house/foliage_A.mtl',height:0.95},
  berry:{model:'../../assets/shared/homely-house/foliage_B.obj',mtl:'../../assets/shared/homely-house/foliage_B.mtl',height:1.18},
  rock:{model:'../../assets/roblox/survival-core-world-v1/rock_medium.obj',mtl:'../../assets/roblox/survival-core-world-v1/survival-core-world.mtl',height:1.06},
  boar:{model:'../../assets/roblox/monster-adventure-v1/boar.obj',mtl:'../../assets/roblox/monster-adventure-v1/monster-adventure.mtl',height:1.7},
  roof:{model:'../../assets/roblox/survival-core-world-v1/roof_gable.obj',mtl:'../../assets/roblox/survival-core-world-v1/survival-core-world.mtl',height:1.4},
  wall:{model:'../../assets/roblox/survival-core-world-v1/wall_solid.obj',mtl:'../../assets/roblox/survival-core-world-v1/survival-core-world.mtl',height:2.2},
  foundation:{model:'../../assets/roblox/survival-core-world-v1/foundation_rect.obj',mtl:'../../assets/roblox/survival-core-world-v1/survival-core-world.mtl',height:.38},
  lamp:{model:'../../assets/roblox/survival-core-world-v1/lamp.obj',mtl:'../../assets/roblox/survival-core-world-v1/survival-core-world.mtl',height:1.3}
});
// Not present in the canonical company asset library: do not invent a quadruped or
// disguise another species as rabbit or deer. This remains a release blocker.
export const MISSING_SPECIES_ORIGINALS=Object.freeze(['rabbit','deer']);

function url(relative){return new URL(relative,import.meta.url);}
function normalizedAsset(scene,height){
  const bounds=new THREE.Box3().setFromObject(scene);
  const size=bounds.getSize(new THREE.Vector3());
  if(!Number.isFinite(size.y)||size.y<.0001||!Number.isFinite(size.x+size.z))throw Error('EMPTY_ORIGINAL_MODEL');
  const scale=height/size.y;
  const root=new THREE.Group();
  scene.scale.setScalar(scale);
  scene.position.set(-(bounds.min.x+bounds.max.x)*scale/2,-bounds.min.y*scale,
    -(bounds.min.z+bounds.max.z)*scale/2);
  root.add(scene);
  scene.traverse(o=>{
    if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.frustumCulled=true;}
  });
  return root;
}
async function loadOriginalSet(){
  const glb=new GLTFLoader(),obj=new OBJLoader(),mtl=new MTLLoader();
  const models=new Map(),errors=[];
  const mtlCache=new Map();
  await Promise.all(Object.entries(ORIGINAL_ASSETS).map(async ([id,source])=>{
    try {
      let scene;
      if(source.kind==='glb'){
        const sourceFile=await glb.loadAsync(url(source.model).href);
        scene=sourceFile.scene;
      }else{
        // The original OBJ vertices and every per-face .mtl material are preserved.
        let materials=mtlCache.get(source.mtl);
        if(!materials){
          materials=mtl.loadAsync(url(source.mtl).href);
          mtlCache.set(source.mtl,materials);
        }
        const palette=await materials;
        palette.preload();
        const loader=new OBJLoader();
        loader.setMaterials(palette);
        scene=await loader.loadAsync(url(source.model).href);
      }
      models.set(id,normalizedAsset(scene,source.height));
    }catch(error){errors.push({id,reason:String(error?.message||error)});}
  }));
  return {models,errors};
}
function originalClone(source){
  // Only static OBJ assets are duplicated; the skinned GLB is used once as the player.
  return source?.clone(true)||null;
}
function attachModel(parent,model,x,z){
  const instance=originalClone(model);
  if(!instance)return null;
  instance.position.set(x/SCALE,0,z/SCALE);
  parent.add(instance);
  return instance;
}
function originalCamp(parent,modelSet){
  const tent=new THREE.Group();
  const base=attachModel(tent,modelSet.get('foundation'),0,0);
  const left=attachModel(tent,modelSet.get('wall'),-74,0);
  const right=attachModel(tent,modelSet.get('wall'),74,0);
  const roof=attachModel(tent,modelSet.get('roof'),0,0);
  if(left)left.rotation.y=Math.PI/2;
  if(right)right.rotation.y=Math.PI/2;
  if(roof)roof.position.y+=2.2;
  parent.add(tent);
  return tent;
}
export function createWild3D({canvas,WORLD,resources,animals}){
  if(!canvas||!window.WebGL2RenderingContext)throw Error('WebGL2가 필요해.');
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.22;
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,matchMedia('(pointer:coarse)').matches?1.15:1.6));
  renderer.setSize(innerWidth,innerHeight,false);
  const scene=new THREE.Scene();
  const day=new THREE.Color('#a7c5ca'),night=new THREE.Color('#162637');
  scene.background=day.clone();
  scene.fog=new THREE.FogExp2(day.clone(),.014);
  const camera=new THREE.PerspectiveCamera(58,innerWidth/innerHeight,.1,160);
  const hemi=new THREE.HemisphereLight('#e1f2ff','#425c43',1.9);
  scene.add(hemi);
  const sun=new THREE.DirectionalLight('#ffe8c4',2.3);
  sun.position.set(-18,33,-15);
  sun.castShadow=true;
  sun.shadow.mapSize.set(1024,1024);
  sun.shadow.camera.left=-18;sun.shadow.camera.right=18;
  sun.shadow.camera.top=18;sun.shadow.camera.bottom=-18;
  sun.shadow.camera.near=1;sun.shadow.camera.far=75;
  sun.shadow.bias=-.0003;
  sun.target.position.set(0,0,0);scene.add(sun,sun.target);
  const water=new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD.w/SCALE,WORLD.riverH/SCALE),
    new THREE.MeshStandardMaterial({color:'#5b99af',metalness:.09,roughness:.34,transparent:true,opacity:.85}));
  water.rotation.x=-Math.PI/2;
  water.position.set(WORLD.w/(2*SCALE),.015,(WORLD.riverY+WORLD.riverH/2)/SCALE);
  scene.add(water);
  const ground=new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD.w/SCALE,WORLD.h/SCALE),
    new THREE.MeshStandardMaterial({color:'#627c50',roughness:1}));
  ground.rotation.x=-Math.PI/2;
  ground.position.set(WORLD.w/(2*SCALE),-.07,WORLD.h/(2*SCALE));
  ground.receiveShadow=true;
  scene.add(ground);
  // Terrain is a walkable WebGL plane; every *discrete asset* must come from source files.
  const world=new THREE.Group();scene.add(world);
  const rain=new THREE.Group();scene.add(rain);
  const rainGeometry=new THREE.BufferGeometry(),rainPositions=new Float32Array(90*6);
  rainGeometry.setAttribute('position',new THREE.BufferAttribute(rainPositions,3));
  const rainLine=new THREE.LineSegments(rainGeometry,
    new THREE.LineBasicMaterial({color:'#b4d8ec',transparent:true,opacity:.65,depthWrite:false}));
  rain.add(rainLine);rain.visible=false;
  const keyStatus=document.getElementById('renderStatus');
  let ready=false,assetErrors=[],models=new Map(),props=[],creatures=[],hero=null,camp=null,fire=null;
  const load=loadOriginalSet().then(result=>{
    models=result.models;assetErrors=result.errors;
    document.body.dataset.nativeAssetLoaded=String(models.size);
    document.body.dataset.nativeAssetFailed=String(assetErrors.length);
    // Never accept geometry substitutes for original files.
    if(assetErrors.length){
      document.body.dataset.spatialDimension='3d-error';
      if(keyStatus){keyStatus.hidden=false;keyStatus.textContent='원본 3D 에셋 로드 실패: '+assetErrors.map(e=>e.id).join(', ');}
      return;
    }
    props=resources.map((r,i)=>{
      const type=r.type==='tree'?(i%3?'tree':'treeLarge'):
        r.type==='stone'?'rock':r.type==='fiber'?'fiber':'berry';
      const instance=attachModel(world,models.get(type),r.x,r.y);
      if(instance){instance.rotation.y=(i*.73)%6.283;instance.scale.multiplyScalar(.84+(i%6)*.06);}
      return instance;
    });
    creatures=animals.map(a=>{
      // The exact authored boar model is available; rabbit/deer remain unbound.
      const model=a.type==='boar'?models.get('boar'):null;
      return model?attachModel(world,model,a.x,a.y):null;
    });
    hero=models.get('player');
    hero.position.set(0,0,0);world.add(hero);
    camp=originalCamp(world,models);
    fire=attachModel(world,models.get('lamp'),0,0);
    document.body.dataset.nativeAssetsBound=String(props.filter(Boolean).length+creatures.filter(Boolean).length+3);
    document.body.dataset.missingOriginalSpecies=MISSING_SPECIES_ORIGINALS.join(',');
    ready=true;
  }).catch(error=>{
    document.body.dataset.spatialDimension='3d-error';
    if(keyStatus){keyStatus.hidden=false;keyStatus.textContent='원본 3D 에셋 연결 실패: '+String(error?.message||error);}
  });
  let frames=0,w=innerWidth,h=innerHeight,glLost=false,last=performance.now();
  canvas.addEventListener('webglcontextlost',e=>{
    e.preventDefault();glLost=true;document.body.dataset.spatialDimension='3d-error';
    if(keyStatus){keyStatus.hidden=false;keyStatus.textContent='WebGL 연결이 끊어졌어. 다시 열어 줘.';}
  });
  const vCam=new THREE.Vector3(),vTarget=new THREE.Vector3();
  function render(S,now){
    if(glLost||!ready)return;
    if(w!==innerWidth||h!==innerHeight){
      w=innerWidth;h=innerHeight;renderer.setSize(w,h,false);
      camera.aspect=w/Math.max(1,h);camera.updateProjectionMatrix();
    }
    const p=S.player;
    document.body.dataset.playerWorldX=Number(p.x).toFixed(2);
    document.body.dataset.playerWorldY=Number(p.y).toFixed(2);
    props.forEach((o,i)=>{if(o)o.visible=resources[i].amount>0;});
    creatures.forEach((o,i)=>{
      if(!o)return;
      const a=animals[i];o.visible=a.dead<=0;
      o.position.set(a.x/SCALE,0,a.y/SCALE);
      if(Math.hypot(a.vx||0,a.vy||0)>.05)o.rotation.y=Math.atan2(-(a.vx||0),-(a.vy||0));
      o.position.y=o.visible?Math.sin(now*.005+i)*.025:0;
    });
    hero.position.set(p.x/SCALE,0,p.y/SCALE);
    hero.rotation.y=Math.atan2(-p.faceX,-p.faceY);
    if(camp){
      camp.visible=Number(S.camp.shelter)>0;
      camp.position.set(S.camp.x/SCALE,0,S.camp.y/SCALE);
      camp.scale.setScalar(S.camp.shelter>=2?1.16:1);
    }
    if(fire){
      fire.visible=!!S.camp.fire;
      fire.position.set(S.camp.x/SCALE,0,S.camp.y/SCALE);
    }
    const x=p.x/SCALE,z=p.y/SCALE;
    vCam.set(x+5.6,10.6,z+16.6);
    camera.position.lerp(vCam,frames<2?1:.13);
    vTarget.set(x,1.55,z-3.4);
    camera.lookAt(vTarget);
    sun.position.set(x-18,33,z-15);
    sun.target.position.set(x,0,z);
    sun.target.updateMatrixWorld();
    const sunlight=Math.max(.04,Math.sin((S.time/60-5)/24*Math.PI*2));
    hemi.intensity=.35+sunlight*1.65;
    sun.intensity=.13+sunlight*2.2;
    scene.background.copy(night).lerp(day,Math.min(1,sunlight));
    scene.fog.color.copy(scene.background);
    scene.fog.density=S.weather==='storm'?.027:S.weather==='rain'?.022:.014;
    const wet=S.weather==='rain'||S.weather==='storm';
    rain.visible=wet;
    if(wet){
      const n=S.weather==='storm'?90:44,t=now*.016;
      for(let i=0;i<n;i++){
        const a=(i*3.79%26)-13,b=(i*4.73%32)-16,yy=((i*1.77-t)%13+13)%13;
        const k=i*6;
        rainPositions[k]=x+a;rainPositions[k+1]=yy;rainPositions[k+2]=z+b;
        rainPositions[k+3]=x+a-.14;rainPositions[k+4]=yy-.7;rainPositions[k+5]=z+b;
      }
      for(let i=n;i<90;i++)rainPositions.fill(-999,i*6,i*6+6);
      rainGeometry.attributes.position.needsUpdate=true;
    }
    renderer.render(scene,camera);
    if(++frames===1){
      document.body.dataset.spatialDimension='3d';
      document.body.dataset.renderer='three-webgl';
      canvas.dataset.renderedFrame='true';
      if(keyStatus)keyStatus.hidden=true;
    }
    if(frames%60===0)document.body.dataset.webglFrames=String(frames);
    last=now;
  }
  return {render,bindMovement(){},get frameCount(){return frames},get loadResult(){return load}};
}
