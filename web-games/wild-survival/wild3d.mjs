// Wild Forest mobile: original native GLB/OBJ assets only.
// The existing survival game owns saves, AI, combat, crafting and world coordinates.
// NO generated animal, character, tree, rock, building or fake Canvas2D fallback.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';

const SCALE=72;
const local=(p)=>new URL(p,import.meta.url).href;
const files={
  traveler:{file:'../../assets/shared/humanoid-traveler-actions.glb',height:2.95},
  rabbit:{file:'./assets/rabbit.glb',height:.64},
  deer:{file:'./assets/deer.glb',height:1.8},
  tree_oak:{file:'./assets/tree_oak.glb',height:5.7},
  tree_detailed:{file:'./assets/tree_detailed.glb',height:6.4},
  tree_fat:{file:'./assets/tree_fat.glb',height:4.8},
  tree_pineDefaultA:{file:'./assets/tree_pineDefaultA.glb',height:6.2},
  plant_bush:{file:'./assets/plant_bush.glb',height:1.1},
  grass:{file:'./assets/grass.glb',height:.64},
  plant_flatTall:{file:'./assets/plant_flatTall.glb',height:.85},
  rock_smallA:{file:'./assets/rock_smallA.glb',height:.55},
  rock_largeA:{file:'./assets/rock_largeA.glb',height:1.2},
  stone_tallA:{file:'./assets/stone_tallA.glb',height:1.55},
  flower_redA:{file:'./assets/flower_redA.glb',height:.7},
  mushroom_red:{file:'./assets/mushroom_red.glb',height:.5}
};
const objFiles={
  boar:{model:'../../assets/roblox/monster-adventure-v1/boar.obj',
    material:'../../assets/roblox/monster-adventure-v1/monster-adventure.mtl',height:1.3},
  foundation:{model:'../../assets/roblox/survival-core-world-v1/foundation_rect.obj',
    material:'../../assets/roblox/survival-core-world-v1/survival-core-world.mtl',height:.45},
  wall:{model:'../../assets/roblox/survival-core-world-v1/wall_solid.obj',
    material:'../../assets/roblox/survival-core-world-v1/survival-core-world.mtl',height:2.2},
  roof:{model:'../../assets/roblox/survival-core-world-v1/roof_gable.obj',
    material:'../../assets/roblox/survival-core-world-v1/survival-core-world.mtl',height:1.7},
  lamp:{model:'../../assets/roblox/survival-core-world-v1/lamp.obj',
    material:'../../assets/roblox/survival-core-world-v1/survival-core-world.mtl',height:1.0}
};
const REQUIRED=['traveler','rabbit','deer','boar','tree_oak','tree_detailed','tree_fat',
  'tree_pineDefaultA','plant_bush','grass','plant_flatTall','rock_smallA',
  'rock_largeA','stone_tallA','flower_redA','mushroom_red','foundation','wall','roof','lamp'];

function normalizedModel(scene,height,originalZUp=false){
  const oriented=new THREE.Group();
  oriented.add(scene);
  if(originalZUp)scene.rotation.x=-Math.PI/2; // OBJ original export Z-up; Three.js uses Y-up
  oriented.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(oriented);
  const size=bounds.getSize(new THREE.Vector3());
  if(!Number.isFinite(size.y)||size.y<=.000001)throw Error('model has invalid geometry bounds');
  const factor=height/size.y;
  oriented.scale.setScalar(factor);
  oriented.position.set(-(bounds.min.x+bounds.max.x)*.5*factor,
    -bounds.min.y*factor,-(bounds.min.z+bounds.max.z)*.5*factor);
  return oriented;
}
function errorScreen(message){
  const label=document.getElementById('renderStatus');
  if(label){label.textContent='원본 3D 에셋 오류: '+message;label.hidden=false;}
  document.body.dataset.spatialDimension='3d-error';
  console.error('[Wild Forest mobile GLB/OBJ]',message);
}
function loadNative(glb,mtl,definition){
  return new Promise((resolve,reject)=>{
    if(glb){
      new GLTFLoader().load(local(definition.file),v=>{
        try{resolve({template:normalizedModel(v.scene,definition.height),clips:v.animations||[]});}
        catch(e){reject(e);}
      },undefined,reject);
      return;
    }
    const loadGeometry=materials=>{
      const obj=new OBJLoader();
      if(materials){materials.preload();obj.setMaterials(materials);}
      obj.load(local(definition.model),o=>{
        try{resolve({template:normalizedModel(o,definition.height,true),clips:[]});}
        catch(e){reject(e);}
      },undefined,reject);
    };
    new MTLLoader().load(local(definition.material),loadGeometry,undefined,reject);
  });
}

export function createWild3D({canvas,WORLD,resources,animals}){
  if(!canvas||!window.WebGL2RenderingContext)throw Error('3D 전용 모바일 브라우저 WebGL2가 필요해.');
  // Fixed mobile budgets: no shadows, no antialias MSAA on small screens, no 2D fallback.
  const coarse=matchMedia('(pointer:coarse)').matches;
  const renderer=new THREE.WebGLRenderer({canvas,powerPreference:'low-power',antialias:!coarse,alpha:false});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,coarse?1.15:1.6));
  renderer.setSize(innerWidth,innerHeight,false);
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.25;
  renderer.shadowMap.enabled=false;
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(63,innerWidth/Math.max(innerHeight,1),.1,145);
  const skyDay=new THREE.Color('#a2bfca'),skyNight=new THREE.Color('#1a293c');
  scene.background=skyDay.clone();scene.fog=new THREE.FogExp2(skyDay.clone(),.011);
  const hemi=new THREE.HemisphereLight(0xe2efff,0x4c6249,1.85);scene.add(hemi);
  const sun=new THREE.DirectionalLight(0xffe4b3,2.45);
  sun.position.set(-22,35,-25);scene.add(sun);
  // Flat ground and river are technical render surfaces, not substitutes for original objects.
  const ground=new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD.w/SCALE,WORLD.h/SCALE),
    new THREE.MeshStandardMaterial({color:'#537651',roughness:1}));
  ground.rotation.x=-Math.PI/2;
  ground.position.set(WORLD.w/(SCALE*2),-.085,WORLD.h/(SCALE*2));
  scene.add(ground);
  const water=new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD.w/SCALE,WORLD.riverH/SCALE),
    new THREE.MeshPhysicalMaterial({color:'#548eaa',roughness:.25,transparent:true,opacity:.82,depthWrite:false}));
  water.rotation.x=-Math.PI/2;
  water.position.set(WORLD.w/(SCALE*2),-.04,(WORLD.riverY+WORLD.riverH*.5)/SCALE);
  scene.add(water);
  // Original model registry; no boxes/spheres/cylinders used as interactive assets.
  const registry=new Map(),templates=new Map(),holders=[],animalHolders=[];
  let player=null,playerMixer=null,playerClips=[],lastAction=null,playable=false,failed=false,frames=0;
  const pending=new Set(REQUIRED);
  const spawn=(name,x,y,rot=0,scale=1)=>{
    const template=templates.get(name);
    if(!template)return null;
    const obj=cloneSkinned(template);
    obj.position.set(x/SCALE,0,y/SCALE);
    obj.rotation.y=rot;obj.scale.multiplyScalar(scale);
    obj.userData.modelId=name;scene.add(obj);return obj;
  };
  const addResources=()=>{
    for(let i=0;i<resources.length;i++){
      const r=resources[i];
      const choices=r.type==='tree'?['tree_oak','tree_detailed','tree_fat','tree_pineDefaultA']
       :r.type==='stone'?['rock_smallA','rock_largeA','stone_tallA']
       :r.type==='fiber'?['grass','plant_flatTall']
       :['plant_bush','flower_redA'];
      const model=choices[i%choices.length];
      const item=spawn(model,r.x,r.y,(i*1.4)%6.28,r.type==='tree'?.80+(i%5)*.14:1);
      if(item)holders.push({item,resource:r});
    }
    for(let i=0;i<animals.length;i++){
      const a=animals[i],obj=spawn(a.type,a.x,a.y,0);
      if(obj)animalHolders.push({item:obj,animal:a});
    }
  };
  const camp=new THREE.Group();scene.add(camp);
  const base=new THREE.Group(),walls=new THREE.Group(),roof=new THREE.Group(),fire=new THREE.Group();
  camp.add(base,walls,roof,fire);
  const campObjects=()=>{
    const foundation=spawn('foundation',0,0),front=spawn('wall',0,0),
      back=spawn('wall',0,0),west=spawn('wall',0,0),east=spawn('wall',0,0),top=spawn('roof',0,0),
      lamp=spawn('lamp',0,0);
    // All component meshes are imported from the same original modular survival OBJ set.
    const reparent=(o,dest,x,y,z,angle=0)=>{
      if(!o)return;
      o.removeFromParent();dest.add(o);o.position.set(x,y,z);o.rotation.y=angle;
    };
    reparent(foundation,base,0,.0,0);
    reparent(front,walls,0,.2,-1.1);
    reparent(back,walls,0,.2,1.1);
    reparent(west,walls,-1.3,.2,0,Math.PI/2);
    reparent(east,walls,1.3,.2,0,Math.PI/2);
    reparent(top,roof,0,2.15,0);
    reparent(lamp,fire,1.4,.1,-1.0);
    // Existing fire system uses the original lantern source, not a generated flame primitive.
  };
  const readiness=document.getElementById('renderStatus');
  const markReady=()=>{
    if(pending.size||failed)return;
    addResources();
    campObjects();
    player=spawn('traveler',480,560);
    if(!player){errorScreen('플레이어 GLB를 불러오지 못했어');failed=true;return;}
    const data=registry.get('traveler');
    playerClips=data?.clips||[];
    if(playerClips.length)playerMixer=new THREE.AnimationMixer(player);
    playable=true;
    document.body.dataset.original3dAssets='loaded';
    document.body.dataset.assetModelCount=String(REQUIRED.length);
    document.body.dataset.playerAsset='humanoid-traveler-actions.glb';
    document.body.dataset.mobile3dMode=coarse?'mobile':'desktop';
    if(readiness)readiness.hidden=true;
  };
  for(const name of REQUIRED){
    const definition=files[name]||objFiles[name];
    loadNative(!!files[name],null,definition).then(data=>{
      if(failed)return;
      templates.set(name,data.template);registry.set(name,data);pending.delete(name);
      document.body.dataset.assetsPending=String(pending.size);
      markReady();
    }).catch(e=>{
      failed=true;errorScreen(name+': '+String(e?.message||e));
    });
  }
  let width=innerWidth,height=innerHeight,lastNow=0,lastLocomotion='none',viewCenter=new THREE.Vector3();
  // Grounded-style LOCKED third-person chase: rear shoulder, one perspective, no zoom/2D modes.
  // Yaw is eased around the player heading, not tied to fixed world north.
  let cameraYaw=Math.atan2(-1,-0),cameraYawReady=false;
  const cameraAim=new THREE.Vector3();
  const CAMERA_DISTANCE=7.2,CAMERA_HEIGHT=4.0,CAMERA_SHOULDER=.56,CAMERA_LOOK_AHEAD=2.05;
  const HALF_PI=Math.PI*.5;
  const wrapAngle=a=>Math.atan2(Math.sin(a),Math.cos(a));
  function mapInput(screenX,screenY) {
    // Mobile joystick remains screen-relative while camera follows the player.
    // Positive stick Y is down; pushing up means world forward, never backward.
    const yaw=cameraYaw;
    const forwardX=-Math.sin(yaw),forwardY=-Math.cos(yaw);
    return {
      x:screenX*(-forwardY)-screenY*forwardX,
      y:screenX*forwardX-screenY*forwardY
    };
  }
  const localVelocity=()=>0;
  let motion=localVelocity;
  function selectClip(active,name){
    if(!playerMixer||!playerClips.length)return;
    const key=active?'attack':name;
    const candidate=playerClips.find(c=>c.name.toLowerCase().includes(key));
    if(!candidate)return;
    if(lastAction===candidate.name)return;
    const next=playerMixer.clipAction(candidate);
    next.enabled=true;next.reset().fadeIn(.18).play();
    if(lastAction){
      const old=playerClips.find(c=>c.name===lastAction);
      if(old)playerMixer.clipAction(old).fadeOut(.18);
    }
    lastAction=candidate.name;
  }
  function resize(){
    if(width===innerWidth&&height===innerHeight)return;
    width=innerWidth;height=innerHeight;
    renderer.setSize(width,height,false);
    camera.aspect=width/Math.max(height,1);camera.updateProjectionMatrix();
  }
  function render(S,now){
    if(!playable||failed)return;
    resize();
    const p=S.player,px=p.x/SCALE,pz=p.y/SCALE;
    document.body.dataset.playerWorldX=Number(p.x).toFixed(2);
    document.body.dataset.playerWorldY=Number(p.y).toFixed(2);
    player.position.set(px,0,pz);
    player.rotation.y=Math.atan2(-p.faceX,-p.faceY);
    const moving=S.started&&!S.dead&&motion()>.01;
    const striking=now-p.attackAt<230;
    if(playerMixer){
      selectClip(striking,moving?'walk':'idle');
      playerMixer.update(lastNow?Math.min(.04,(now-lastNow)/1000):0);
    }else if(moving){
      player.position.y=Math.abs(Math.sin(now*.009))*.06; // animate source mesh transform only
    }
    for(const {item,resource} of holders){
      item.visible=resource.amount>0&&Math.abs(resource.x-p.x)<2700&&Math.abs(resource.y-p.y)<2700;
    }
    for(const {item,animal} of animalHolders){
      item.visible=animal.dead<=0&&Math.abs(animal.x-p.x)<2700&&Math.abs(animal.y-p.y)<2700;
      if(!item.visible)continue;
      item.position.set(animal.x/SCALE,Math.sin(now*.003+animal.x)*.022,animal.y/SCALE);
      if(Math.abs(animal.vx||0)+Math.abs(animal.vy||0)>.04)
        item.rotation.y=Math.atan2(-animal.vx,-animal.vy);
    }
    camp.position.set(S.camp.x/SCALE,0,S.camp.y/SCALE);
    base.visible=walls.visible=roof.visible=S.camp.shelter>0;
    roof.visible=S.camp.shelter>=2;
    fire.visible=!!S.camp.fire;
    const hour=S.time/60,light=Math.max(.06,Math.sin((hour-5)/24*Math.PI*2));
    hemi.intensity=.42+light*1.48;sun.intensity=.15+light*2.30;
    scene.background.copy(skyNight).lerp(skyDay,Math.min(1,light));
    scene.fog.color.copy(scene.background);
    scene.fog.density=S.weather==='storm'?.034:S.weather==='rain'?.020:.011;
    // Character-relative fixed chase camera: look over the same shoulder at the same height.
    // Keep the angle stable while idle; damp turn changes to avoid phone nausea.
    const desiredYaw=Math.atan2(-p.faceX,-p.faceY);
    if(!cameraYawReady){cameraYaw=desiredYaw;cameraYawReady=true;}
    const frameDt=lastNow?Math.min(.05,Math.max(0,(now-lastNow)/1000)):1/60;
    cameraYaw+=wrapAngle(desiredYaw-cameraYaw)*(1-Math.exp(-frameDt*5.4));
    const frontX=-Math.sin(cameraYaw),frontY=-Math.cos(cameraYaw);
    const rightX=-frontY,rightY=frontX;
    const behindX=-frontX*CAMERA_DISTANCE,behindY=-frontY*CAMERA_DISTANCE;
    const target=new THREE.Vector3(
      px+behindX+rightX*CAMERA_SHOULDER,CAMERA_HEIGHT,
      pz+behindY+rightY*CAMERA_SHOULDER
    );
    // One locked view; no pinch zoom or camera mode switching.
    camera.position.lerp(target,frames===0?1:1-Math.exp(-frameDt*10));
    const aimed=new THREE.Vector3(
      px+frontX*CAMERA_LOOK_AHEAD,1.56,
      pz+frontY*CAMERA_LOOK_AHEAD
    );
    cameraAim.lerp(aimed,frames===0?1:1-Math.exp(-frameDt*12));
    camera.lookAt(cameraAim);
    document.body.dataset.cameraMode='fixed-third-person';
    document.body.dataset.cameraView='over-shoulder';
    document.body.dataset.cameraYaw=String(cameraYaw.toFixed(3));
    renderer.render(scene,camera);
    frames++;
    if(frames===1){document.body.dataset.spatialDimension='3d';
      document.body.dataset.renderer='three-webgl';
      canvas.dataset.renderedFrame='true';
    }
    if(frames%60===0)document.body.dataset.webglFrames=String(frames);
    lastNow=now;
  }
  canvas.addEventListener('webglcontextlost',e=>{
    e.preventDefault();failed=true;playable=false;errorScreen('GPU 연결이 끊어졌어. 새로고침이 필요해.');
  });
  return {
    render,
    mapInput,
    bindMovement(fn){if(typeof fn==='function')motion=fn;},
    get frameCount(){return frames;},
    get ready(){return playable&&!failed;},
    get assetErrors(){return failed;}
  };
}
