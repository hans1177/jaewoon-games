// 마력숲 본편 전용, 검증 전 3D 환경/캐릭터 브리지.
// 기존 게임 상태, 공격/저장/충돌/멀티플레이와 소유권을 공유하지 않고 표현만 수신한다.
// Local CC0 sources: TinyTreats Homely House + KayKit Adventures; see assets/asset-license-ledger.json.
// No remote hotlink / no unverified species substitution / no fake 3D claims.
import * as THREE from '../../assets/roblox/world-ghosts/native/mesh/three/three.module.js';
import { GLTFLoader } from '../../assets/roblox/world-ghosts/native/mesh/three/examples/jsm/loaders/GLTFLoader.js';

const UNIT=45, TREE_LIMIT=200;
const TREE_URL='../../assets/shared/homely-house/tree.obj';
const PLAYER_URL='../../assets/roblox/actors/native/mage.glb';

function parseObjGeometry(source){
 const vertices=[],tris=[];
 for(const raw of source.split(/\r?\n/)){
  const line=raw.trim();
  if(line.startsWith('v ')){
   const p=line.split(/\s+/).slice(1,4).map(Number);
   if(p.length===3&&p.every(Number.isFinite))vertices.push(p);
  }else if(line.startsWith('f ')){
   const refs=line.split(/\s+/).slice(1).map(f=>{
    const index=Number(f.split('/')[0]);
    return Number.isInteger(index)?(index>0?index-1:vertices.length+index):-1
   });
   if(refs.length<3||refs.some(i=>i<0||i>=vertices.length))continue;
   for(let k=1;k<refs.length-1;k++){
    for(const index of [refs[0],refs[k],refs[k+1]])tris.push(...vertices[index]);
   }
  }
 }
 if(!tris.length)throw Error('EMPTY_OBJ_GEOMETRY');
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(tris,3));
 geometry.computeVertexNormals();
 return geometry
}

export async function createForest3DOverlay(canvas){
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.4));
 renderer.setClearColor(0x000000,0);
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 const scene=new THREE.Scene();
 const camera=new THREE.OrthographicCamera(-1,1,1,-1,.1,300);
 camera.up.set(0,0,-1);
 scene.add(new THREE.HemisphereLight(0xe7fff4,0x334636,2));
 const sunlight=new THREE.DirectionalLight(0xfff5d2,2.3);
 sunlight.position.set(-16,35,-18);
 scene.add(sunlight);
 let treeInstances=null,avatar=null,mixer=null,clips=[],playing=null,elapsed=0,previousAttackAt=0,lastW=0,lastH=0,disposed=false,contextLost=false;
 const report={tree:false,player:false,frameCount:0,renderedTrees:0,visible:false};
 const temp=new THREE.Object3D();
 const result={hasTrees:false,hasPlayer:false,get status(){return {...report}},draw,dispose};
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();contextLost=true;result.hasTrees=result.hasPlayer=false;canvas.style.display='none'});
 const jobs=[
  fetch(TREE_URL).then(r=>{if(!r.ok)throw Error('TREE_HTTP_'+r.status);return r.text()}).then(obj=>{
   if(disposed||contextLost)return;
   const geom=parseObjGeometry(obj);
   const material=new THREE.MeshStandardMaterial({color:0x789769,roughness:1,metalness:0,flatShading:true,side:THREE.DoubleSide,depthTest:true});
   treeInstances=new THREE.InstancedMesh(geom,material,TREE_LIMIT);
   treeInstances.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
   treeInstances.frustumCulled=false;
   treeInstances.count=0;
   scene.add(treeInstances);
   result.hasTrees=report.tree=true;
  }),
  new GLTFLoader().loadAsync(PLAYER_URL).then(gltf=>{
   if(disposed||contextLost)return;
   avatar=gltf.scene;
   const bounds=new THREE.Box3().setFromObject(avatar),size=bounds.getSize(new THREE.Vector3());
   if(!size.length()||!Number.isFinite(size.length()))throw Error('INVALID_PLAYER_MESH');
   // Original downloaded asset geometry, normalized only for display scale; not a model replacement.
   const scale=.8/Math.max(.1,size.x,size.z);
   avatar.scale.multiplyScalar(scale);
   const scaledBounds=new THREE.Box3().setFromObject(avatar);
   const center=scaledBounds.getCenter(new THREE.Vector3());
   avatar.position.set(-center.x,-scaledBounds.min.y,-center.z);
   scene.add(avatar);
   clips=(gltf.animations||[]).filter(c=>c?.tracks?.length);
   if(clips.length)mixer=new THREE.AnimationMixer(avatar);
   result.hasPlayer=report.player=true;
  })
 ];
 await Promise.allSettled(jobs);
 if(!result.hasTrees&&!result.hasPlayer){dispose();throw Error('DOWNLOADED_3D_ASSETS_UNAVAILABLE')}
 canvas.style.display='block';
 return result;

 function draw(state,width,height,dt){
  if(disposed||contextLost)return;
  if(state.area!=='surface'){canvas.style.display='none';report.visible=false;return}
  if(canvas.style.display==='none')canvas.style.display='block';
  report.visible=true;
  if(lastW!==width||lastH!==height){
   lastW=width;lastH=height;
   renderer.setSize(width,height,false);
   camera.left=-width/(2*UNIT);camera.right=width/(2*UNIT);
   camera.top=height/(2*UNIT);camera.bottom=-height/(2*UNIT);
   camera.updateProjectionMatrix();
  }
  const centerX=(state.camera.x+width/2)/UNIT,centerZ=(state.camera.y+height/2)/UNIT;
  camera.position.set(centerX,110,centerZ);camera.lookAt(centerX,0,centerZ);
  if(treeInstances){
   let n=0;
   const left=state.camera.x-80,right=state.camera.x+width+80,top=state.camera.y-80,bottom=state.camera.y+height+80;
   for(const tree of state.trees){
    if(tree.dead||tree.x<left||tree.x>right||tree.y<top||tree.y>bottom)continue;
    temp.position.set(tree.x/UNIT,0,tree.y/UNIT);
    temp.rotation.y=(Math.sin(tree.x*.013+tree.y*.005))*2.7;
    const scale=.72+(Math.abs(Math.sin(tree.x*.014+tree.y*.007))*.14);
    temp.scale.setScalar(scale);temp.updateMatrix();treeInstances.setMatrixAt(n++,temp.matrix);
    if(n>=TREE_LIMIT)break;
   }
   treeInstances.count=n;treeInstances.instanceMatrix.needsUpdate=true;
   report.renderedTrees=n;
  }
  if(avatar){
   const p=state.player;
   // Player stays under the same authoritative XY coords as the original survival game.
   // The GLB rig is presentation-only: animation never modifies hit boxes or game state.
   const px=p.x/UNIT,pz=p.y/UNIT;
   avatar.position.x=px;avatar.position.z=pz;
   const facing=Math.atan2(Number(p.faceX)||0,Number(p.faceY)||1);
   avatar.rotation.y=facing;
   if(mixer){
    const active=performance.now()-(Number(p.attackAt)||0)<280?'attack':
      Math.hypot(state.stick.x,state.stick.y)>0.05||state.keys.size>0?'run':'idle';
    const next=clips.find(clip=>new RegExp(active==='run'?'run|walk':active,'i').test(clip.name))||clips[0];
    if(next!==playing){
     mixer.stopAllAction();
     mixer.clipAction(next).reset().fadeIn(.12).play();
     playing=next
    }
    mixer.update(Math.min(.04,Math.max(0,Number(dt)||.016)));
   }
  }
  renderer.render(scene,camera);
  report.frameCount++;
 }
 function dispose(){
  disposed=true;result.hasTrees=result.hasPlayer=false;
  if(treeInstances){treeInstances.geometry.dispose();treeInstances.material.dispose()}
  renderer.dispose();canvas.style.display='none'
 }
}
