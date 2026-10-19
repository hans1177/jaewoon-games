// Actual optional 3D world renderer attached to the canonical Magic Forest game.
// Preview is opt-in (?preview3d=1): it must not replace verified legacy gameplay
// until native meshes, creatures, terrain interaction and mobile QA all pass.
// Geometry comes from the downloaded, CC0-ledgered Tiny Treats Homely House OBJ pack.
import * as THREE from '../../assets/roblox/world-ghosts/native/mesh/three/three.module.js';

const SOURCE = new URL('../../assets/shared/homely-house/', import.meta.url);
const SCALE = 1 / 48;
const MODEL_NAMES = Object.freeze(['tree','tree_large','foliage_A','cobblestones','bench_A','fence_straight','house']);
const PALETTE = Object.freeze({
  tree:0x59854b, tree_large:0x5e8750, foliage_A:0x83ab63,
  cobblestones:0x8b8c79, bench_A:0x987955, fence_straight:0x927b57, house:0xb6aa83
});

function parseDownloadedObj(text, modelName){
  const raw=[],pos=[],colors=[],base=new THREE.Color(PALETTE[modelName]);
  for(const rawLine of text.split(/\r?\n/)){
    const line=rawLine.trim();
    if(line.startsWith('v ')){
      const v=line.slice(2).trim().split(/\s+/).map(Number);
      if(v.length>=3&&v.slice(0,3).every(Number.isFinite))raw.push(v.slice(0,3));
    }else if(line.startsWith('f ')){
      const indices=line.slice(2).trim().split(/\s+/).map(item=>Number(item.split('/')[0]));
      if(indices.length<3||indices.length>12)continue;
      const verts=indices.map(n=>raw[n>0?n-1:raw.length+n]);
      if(verts.some(v=>!v))throw new Error('OBJ missing geometry: '+modelName);
      for(let i=1;i<verts.length-1;i++){
        const face=[verts[0],verts[i],verts[i+1]],avgY=face.reduce((n,v)=>n+v[1],0)/3;
        const tone=base.clone();
        // Material customization, not replacement geometry. Keep downloaded mesh surfaces.
        if(modelName==='tree'||modelName==='tree_large'){
          if(avgY<.7)tone.set(0x76573a);
          else tone.multiplyScalar(1+Math.min(.18,Math.max(0,avgY-1.2)*.04));
        }else if(modelName==='house'&&avgY>2.6)tone.set(0x69594c);
        for(const v of face){pos.push(v[0],v[1],v[2]);colors.push(tone.r,tone.g,tone.b)}
      }
    }
  }
  if(pos.length<9)throw new Error('Empty downloaded 3D geometry: '+modelName);
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.94,metalness:0,flatShading:true,side:THREE.DoubleSide});
  const model=new THREE.Mesh(geometry,material);
  model.castShadow=true;model.receiveShadow=true;
  return model;
}

async function loadSourceModels(){
  const results=await Promise.all(MODEL_NAMES.map(async name=>{
    const url=new URL(name+'.obj',SOURCE);
    const response=await fetch(url,{cache:'force-cache'});
    if(!response.ok)throw new Error('Downloaded source missing: '+name+' '+response.status);
    const text=await response.text();
    if(!text.includes('v ')||!text.includes('f '))throw new Error('Invalid downloaded 3D model: '+name);
    return [name,parseDownloadedObj(text,name)];
  }));
  return new Map(results);
}

export async function createWorld3d(canvas){
  const models=await loadSourceModels(); // Fail closed: leave the old game active.
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'default'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  const scene=new THREE.Scene();
  scene.background=new THREE.Color(0x244238);
  scene.fog=new THREE.Fog(0x244238,22,90);
  const camera=new THREE.PerspectiveCamera(58,1,.1,120);
  const ambient=new THREE.HemisphereLight(0xe7f5d2,0x263428,2.25);
  scene.add(ambient);
  const sun=new THREE.DirectionalLight(0xffe9b6,2.0);
  sun.position.set(-10,22,8);
  sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);
  sun.shadow.camera.left=-25;sun.shadow.camera.right=25;sun.shadow.camera.top=25;sun.shadow.camera.bottom=-25;
  scene.add(sun);
  const ground=new THREE.Mesh(
    new THREE.PlaneGeometry(220,220),
    new THREE.MeshStandardMaterial({color:0x365a3a,roughness:1})
  );
  ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
  const raycaster=new THREE.Raycaster();
  const groundPlane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
  const entities=new Map();
  const interactables=[];
  let active=false,lastW=0,lastH=0,disposed=false;
  canvas.hidden=true;

  function addVisibleEntity(key,kind,x,y,scale,seen){
    if(!Number.isFinite(x)||!Number.isFinite(y))return;
    if(!models.has(kind))return;
    let row=entities.get(key);
    if(!row){
      const model=models.get(kind).clone();
      scene.add(model);
      row={model};
      entities.set(key,row);
    }
    const model=row.model;
    model.position.set(x*SCALE,0,y*SCALE);
    model.scale.setScalar(scale);
    model.userData.worldPoint={x,y};
    row.seen=seen;
    interactables.push(model);
  }
  function resources(arr,kind,px,py,seen,scale=1){
    if(!Array.isArray(arr))return;
    let rendered=0;
    for(const item of arr){
      if(!item||item.dead)continue;
      if(Math.hypot(item.x-px,item.y-py)>1000)continue;
      addVisibleEntity(kind+':'+String(item.id),kind,item.x,item.y,scale,seen);
      if(++rendered>=65)break;
    }
  }
  function frame(state){
    if(disposed)return;
    if(state.area!=='surface'||!state.player){canvas.hidden=true;active=false;return}
    const p=state.player,px=Number(p.x)||0,py=Number(p.y)||0,centerX=px*SCALE,centerY=py*SCALE;
    const w=window.innerWidth,h=window.innerHeight;
    if(w!==lastW||h!==lastH){
      lastW=w;lastH=h;camera.aspect=w/Math.max(1,h);camera.updateProjectionMatrix();
      renderer.setSize(w,h,false);
    }
    camera.position.set(centerX+1,12,centerY+13);
    camera.lookAt(centerX,0,centerY-2.8);
    ground.position.set(centerX,0,centerY);
    interactables.length=0;
    const seen=state.last||Date.now();
    resources(state.trees,'tree',px,py,seen,1.28);
    resources(state.swampTrees,'tree_large',px,py,seen,1.65);
    resources(state.rocks,'cobblestones',px,py,seen,1.05);
    resources(state.fibers,'foliage_A',px,py,seen,1.2);
    if(state.bench&&Math.hypot(state.bench.x-px,state.bench.y-py)<1000)
      addVisibleEntity('bench','bench_A',state.bench.x,state.bench.y,1.7,seen);
    for(const [i,wall] of (state.walls||[]).entries()){
      if(Math.hypot(wall.x-px,wall.y-py)<1000)
        addVisibleEntity('wall:'+(wall.id||i),'fence_straight',wall.x,wall.y,1.2,seen);
    }
    // Reuse existing world entities. No synthetic monsters or substitute species.
    for(const [key,row] of entities)if(row.seen!==seen){scene.remove(row.model);entities.delete(key)}
    renderer.render(scene,camera);
    active=true;canvas.hidden=false;
  }
  function pick(clientX,clientY){
    if(!active||canvas.hidden||disposed)return null;
    const normalized=new THREE.Vector2(clientX/Math.max(1,lastW)*2-1,-(clientY/Math.max(1,lastH))*2+1);
    raycaster.setFromCamera(normalized,camera);
    const hits=raycaster.intersectObjects(interactables,false);
    if(hits.length&&hits[0].object.userData.worldPoint)
      return {...hits[0].object.userData.worldPoint};
    const point=new THREE.Vector3();
    return raycaster.ray.intersectPlane(groundPlane,point)?{x:point.x/SCALE,y:point.z/SCALE}:null;
  }
  function dispose(){
    disposed=true;active=false;canvas.hidden=true;renderer.dispose();
    for(const row of entities.values())scene.remove(row.model);
    entities.clear();
    for(const model of models.values()){model.geometry.dispose();model.material.dispose()}
    ground.geometry.dispose();ground.material.dispose();
  }
  return {frame,pick,dispose,kind:'NATIVE_WEBGL_CC0_ASSET_PREVIEW',modelCount:models.size};
}
