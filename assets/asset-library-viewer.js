// 파일명: assets/asset-library-viewer.js
// 임포트: 기존 Three.js와 glTF 로더로 실제 메시·스킨·모션을 렌더한다.
import * as THREE from '/assets/roblox/world-ghosts/native/mesh/three/three.module.js';
import {GLTFLoader} from '/assets/roblox/world-ghosts/native/mesh/three/examples/jsm/loaders/GLTFLoader.js';
const COMMON_R15_RECIPE=Object.freeze({
 bones:{
  HumanoidRootPart:{position:[0,3,0],parent:null},LowerTorso:{position:[0,3.05,0],parent:'HumanoidRootPart'},UpperTorso:{position:[0,4.02,0],parent:'LowerTorso'},Head:{position:[0,5.22,0],parent:'UpperTorso'},
  LeftUpperArm:{position:[-1,4.55,0],parent:'UpperTorso'},LeftLowerArm:{position:[-1,3.68,0],parent:'LeftUpperArm'},LeftHand:{position:[-1,3.02,0],parent:'LeftLowerArm'},
  RightUpperArm:{position:[1,4.55,0],parent:'UpperTorso'},RightLowerArm:{position:[1,3.68,0],parent:'RightUpperArm'},RightHand:{position:[1,3.02,0],parent:'RightLowerArm'},
  LeftUpperLeg:{position:[-.47,2.58,0],parent:'LowerTorso'},LeftLowerLeg:{position:[-.47,1.48,0],parent:'LeftUpperLeg'},LeftFoot:{position:[-.47,.52,-.08],parent:'LeftLowerLeg'},
  RightUpperLeg:{position:[.47,2.58,0],parent:'LowerTorso'},RightLowerLeg:{position:[.47,1.48,0],parent:'RightUpperLeg'},RightFoot:{position:[.47,.52,-.08],parent:'RightLowerLeg'}
 },
 palette:{skin:[238,199,168],shirt:[56,98,151],pants:[48,55,73],shoe:[28,31,38]},
 parts:[
  {bone:'LowerTorso',shape:'Block',size:[1.25,.72,.66],position:[0,3.3,0],rotation:[0,0,0],color:'shirt'},{bone:'UpperTorso',shape:'Block',size:[1.6,1.02,.72],position:[0,4.22,0],rotation:[0,0,0],color:'shirt'},{bone:'Head',shape:'Block',size:[.92,.92,.92],position:[0,5.48,0],rotation:[0,0,0],color:'skin'},
  {bone:'LeftUpperArm',shape:'Block',size:[.46,.82,.46],position:[-1,4.12,0],rotation:[0,0,0],color:'shirt'},{bone:'LeftLowerArm',shape:'Block',size:[.42,.66,.42],position:[-1,3.36,0],rotation:[0,0,0],color:'skin'},{bone:'LeftHand',shape:'Block',size:[.46,.36,.46],position:[-1,2.86,0],rotation:[0,0,0],color:'skin'},
  {bone:'RightUpperArm',shape:'Block',size:[.46,.82,.46],position:[1,4.12,0],rotation:[0,0,0],color:'shirt'},{bone:'RightLowerArm',shape:'Block',size:[.42,.66,.42],position:[1,3.36,0],rotation:[0,0,0],color:'skin'},{bone:'RightHand',shape:'Block',size:[.46,.36,.46],position:[1,2.86,0],rotation:[0,0,0],color:'skin'},
  {bone:'LeftUpperLeg',shape:'Block',size:[.58,1.02,.62],position:[-.47,2.08,0],rotation:[0,0,0],color:'pants'},{bone:'LeftLowerLeg',shape:'Block',size:[.52,.92,.56],position:[-.47,1.03,0],rotation:[0,0,0],color:'pants'},{bone:'LeftFoot',shape:'Block',size:[.58,.36,.9],position:[-.47,.34,-.2],rotation:[0,0,0],color:'shoe'},
  {bone:'RightUpperLeg',shape:'Block',size:[.58,1.02,.62],position:[.47,2.08,0],rotation:[0,0,0],color:'pants'},{bone:'RightLowerLeg',shape:'Block',size:[.52,.92,.56],position:[.47,1.03,0],rotation:[0,0,0],color:'pants'},{bone:'RightFoot',shape:'Block',size:[.58,.36,.9],position:[.47,.34,-.2],rotation:[0,0,0],color:'shoe'}
 ]
});
export function createViewer(host){
 let renderer,software=false;
 try{renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'low-power'});}
 catch{
  // Same scene, joints and sampled poses; CPU projection for browsers without WebGL.
  software=true;
  const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d',{alpha:false});
  if(!ctx)throw Error('이 브라우저에서 동작 화면을 열 수 없어.');
  let viewport=[0,0,1,1],animation=null,scheduled=0,lastDraw=0;
  renderer={
   domElement:canvas,setPixelRatio(){},setClearColor(){},setScissorTest(){},setScissor(){},
   setSize(w,h){canvas.width=w;canvas.height=h;},
   setViewport(x,y,w,h){viewport=[x,y,w,h];},
   setAnimationLoop(callback){
    animation=callback;cancelAnimationFrame(scheduled);
    const tick=now=>{if(!animation)return;if(now-lastDraw>=50){lastDraw=now;animation(now);}scheduled=requestAnimationFrame(tick);};
    if(callback)scheduled=requestAnimationFrame(tick);
   },
   render(scene,camera){
    scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);
    const [vx,vy,vw,vh]=viewport,top=canvas.height-vy-vh;
    ctx.save();ctx.beginPath();ctx.rect(vx,top,vw,vh);ctx.clip();
    ctx.fillStyle='#0d1821';ctx.fillRect(vx,top,vw,vh);
    const projection=new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);
    const faces=[],worldA=new THREE.Vector3(),worldB=new THREE.Vector3(),worldC=new THREE.Vector3();
    const edgeA=new THREE.Vector3(),edgeB=new THREE.Vector3(),normal=new THREE.Vector3();
    const light=new THREE.Vector3(-.4,.8,-.6).normalize();
    scene.traverse(mesh=>{
     if(!mesh.isMesh)return;
     const geometry=mesh.geometry,position=geometry.attributes.position,index=geometry.index;
     const count=index?index.count:position.count;
     const rgb=mesh.material.color.clone().convertLinearToSRGB();
     for(let i=0;i<count;i+=3){
      worldA.fromBufferAttribute(position,index?index.getX(i):i).applyMatrix4(mesh.matrixWorld);
      worldB.fromBufferAttribute(position,index?index.getX(i+1):i+1).applyMatrix4(mesh.matrixWorld);
      worldC.fromBufferAttribute(position,index?index.getX(i+2):i+2).applyMatrix4(mesh.matrixWorld);
      normal.crossVectors(edgeA.subVectors(worldB,worldA),edgeB.subVectors(worldC,worldA)).normalize();
      const shade=.42+.58*Math.max(0,normal.dot(light));
      const a=worldA.clone().applyMatrix4(projection),b=worldB.clone().applyMatrix4(projection),c=worldC.clone().applyMatrix4(projection);
      if([a,b,c].some(p=>p.z < -1 || p.z>1))continue;
      faces.push({z:(a.z+b.z+c.z)/3,points:[a,b,c],color:'rgb('+[rgb.r,rgb.g,rgb.b].map(v=>Math.round(Math.min(1,v*(mesh.material.emissiveIntensity>.1?1:shade))*255)).join(',')+')'});
     }
    });
    faces.sort((a,b)=>b.z-a.z);
    for(const face of faces){
     ctx.beginPath();face.points.forEach((p,i)=>{
      const x=vx+(p.x+1)*vw/2,y=top+(1-p.y)*vh/2;
      if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
     });
     ctx.closePath();ctx.fillStyle=face.color;ctx.fill();
    }
    ctx.restore();
   }
  };
 }

 renderer.setPixelRatio(Math.min(devicePixelRatio,matchMedia('(max-width:700px)').matches?1.25:1.5));
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setClearColor(0x0d1821);
 if(!software){renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;}
 host.append(renderer.domElement);
 const geometries={
  Block:new THREE.BoxGeometry(1,1,1),
  Ball:new THREE.SphereGeometry(.5,software?8:16,software?6:12),
  Cylinder:new THREE.CylinderGeometry(.5,.5,1,software?8:16)
 };
 geometries.Cylinder.rotateZ(Math.PI/2);
 // Roblox wedge: back face at +Z; slope descends to the front (-Z).
 const wedge=new THREE.BufferGeometry();
 const v=[[-.5,-.5,-.5],[.5,-.5,-.5],[-.5,-.5,.5],[.5,-.5,.5],[-.5,.5,.5],[.5,.5,.5]];
 const triangles=[0,1,3,0,3,2,2,3,5,2,5,4,0,4,5,0,5,1,0,2,4,1,5,3];
 wedge.setAttribute('position',new THREE.Float32BufferAttribute(triangles.flatMap(i=>v[i]),3));
 wedge.computeVertexNormals();geometries.Wedge=wedge;
 const scene=new THREE.Scene();
 scene.add(new THREE.HemisphereLight(0xc2e5ff,0x3b2b23,2.1));
 for(const [color,intensity,position]of [[0xffddbd,3.2,[-4,8,-6]],[0x71bfff,2.3,[4,5,5]]]){
  const light=new THREE.DirectionalLight(color,intensity);light.position.set(...position);scene.add(light);
 }
 const grid=new THREE.GridHelper(18,18,0x355064,0x233646);grid.position.y=-.08;scene.add(grid);
 const camera=new THREE.PerspectiveCamera(34,1,.01,1000);
 let model=null,materials=[],joints={},entry=null,clip=null,commonMotion=null,center=new THREE.Vector3(),extent=6;
 let nativeMixer=null,nativeClips=[],nativeAction=null,loadRevision=0,zoom=1,pitch=.18;
 let elapsed=0,angle=0,speed=1,paused=matchMedia('(prefers-reduced-motion:reduce)').matches,visible=true;
 // 유틸: 실제 GLB 모델을 교체할 때 텍스처와 메시 GPU 메모리를 회수한다.
 function disposeNative(root){
  const geometries=new Set(),textures=new Set(),nativeMaterials=new Set();
  root?.traverse(node=>{
   if(!node.isMesh)return;
   if(node.geometry)geometries.add(node.geometry);
   for(const mat of(Array.isArray(node.material)?node.material:[node.material])){
    if(!mat)continue;nativeMaterials.add(mat);
    for(const value of Object.values(mat))if(value?.isTexture)textures.add(value);
   }
  });
  for(const texture of textures)texture.dispose();
  for(const mat of nativeMaterials)mat.dispose();
  for(const geometry of geometries)geometry.dispose();
 }
 function clearModel(){
  if(nativeMixer){nativeMixer.stopAllAction();if(model)nativeMixer.uncacheRoot(model);}
  if(model?.userData.nativePreview)disposeNative(model);
  if(model)scene.remove(model);
  for(const mat of materials)mat.dispose();
  materials=[];model=null;nativeMixer=null;nativeClips=[];nativeAction=null;
 }
 function setModel(row,environment=false){
  ++loadRevision;clearModel();
  model=new THREE.Group();materials=[];joints={};entry=row;clip=null;commonMotion=null;elapsed=0;
  grid.visible=!environment;
  const recipe=row.model;
  if(!environment){
   for(const [name,bone]of Object.entries(recipe.bones)){
    const joint=new THREE.Group();joint.userData.rest=new THREE.Vector3(...bone.position);joints[name]=joint;
   }
   for(const [name,bone]of Object.entries(recipe.bones)){
    const joint=joints[name],parent=joints[bone.parent];
    if(parent){joint.userData.rest.sub(new THREE.Vector3(...recipe.bones[bone.parent].position));parent.add(joint);}else model.add(joint);
    joint.position.copy(joint.userData.rest);
   }
  }
  const palette={};
  function material(key,rgb,opacity=1){
   if(palette[key])return palette[key];
   const color=new THREE.Color().setRGB(...rgb.map(x=>x/255),THREE.SRGBColorSpace);
   const value=new THREE.MeshStandardMaterial({color,roughness:.8,metalness:.05,transparent:opacity<1,opacity,
    ...(key==='eye'?{emissive:color,emissiveIntensity:.6}:{})});
   palette[key]=value;materials.push(value);return value;
  }
  for(const part of recipe.parts){
   const rgb=environment?part.color:recipe.palette[part.color];
   const mesh=new THREE.Mesh(geometries[part.shape]||geometries.Block,material(environment?rgb.join(',')+':'+part.transparency:part.color,rgb,1-(part.transparency||0)));
   mesh.scale.set(...part.size);mesh.position.set(...part.position);
   if(!environment)mesh.position.sub(new THREE.Vector3(...recipe.bones[part.bone].position));
   mesh.rotation.set(...part.rotation.map(x=>x*Math.PI/180),environment?'YXZ':'XYZ');
   (environment?model:joints[part.bone]).add(mesh);
  }
  scene.add(model);
  const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3());
  center=bounds.getCenter(new THREE.Vector3());extent=Math.max(size.y,size.x,size.z)*1.16;
  host.dataset.asset=row.id;host.dataset.kind=environment?'environment':'monster';host.dataset.loaded='true';host.dataset.format='recipe';
 }
 // 메인: 등록부의 내부 GLB만 허용하며 실제 삼각형·스킨·클립 개수를 읽는다.
 async function setGLB(source){
  const uri=String(source?.path||'');
  if(!/^\/assets\/shared\/[a-z0-9-]+\.glb$/.test(uri))throw Error('내부 등록된 GLB 경로만 열 수 있어.');
  if(software)throw Error('원본 GLB 렌더링에 WebGL이 필요해.');
  const requestId=++loadRevision,gltf=await new GLTFLoader().loadAsync(uri);
  if(requestId!==loadRevision){disposeNative(gltf.scene);return null;}
  let meshes=0,bones=0,skinned=0,triangles=0;const usedMaterials=new Set();
  gltf.scene.traverse(node=>{
   if(node.isBone)bones++;
   if(!node.isMesh)return;
   meshes++;if(node.isSkinnedMesh)skinned++;
   const geometry=node.geometry,position=geometry?.attributes?.position;
   if(position)triangles+=Math.floor((geometry.index?.count||position.count)/3);
   for(const mat of(Array.isArray(node.material)?node.material:[node.material]))if(mat)usedMaterials.add(mat);
  });
  if(!meshes||!triangles){disposeNative(gltf.scene);throw Error('삼각형이 없는 GLB 모델은 재생하지 않아.');}
  clearModel();model=gltf.scene;model.userData.nativePreview=true;scene.add(model);
  nativeClips=(gltf.animations||[]).filter(row=>Number.isFinite(row.duration)&&row.duration>0);
  nativeMixer=nativeClips.length?new THREE.AnimationMixer(model):null;
  model.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3());
  center=bounds.getCenter(new THREE.Vector3());extent=Math.max(.8,size.x,size.y,size.z)*1.2;
  grid.visible=true;entry=null;clip=null;commonMotion=null;elapsed=0;zoom=1;pitch=.18;
  host.dataset.asset=String(source.id||'');host.dataset.kind='native';host.dataset.loaded='true';
  host.dataset.format='glb';host.dataset.triangles=String(triangles);host.dataset.bones=String(bones);
  if(nativeClips.length)selectNativeClip(nativeClips[0].name);
  return {meshes,skinned,bones,triangles,materials:usedMaterials.size,
   clips:nativeClips.map(row=>({id:row.name,duration:row.duration}))};
 }
 function selectNativeClip(name){
  if(!nativeMixer)return false;
  const next=nativeClips.find(row=>row.name===name);if(!next)return false;
  const action=nativeMixer.clipAction(next);
  if(nativeAction&&nativeAction!==action)nativeAction.fadeOut(.18);
  const once=/(attack|hit|death|stun|skill|cast|shot|bite|pounce|slash|strike|impact)/i.test(name);
  action.reset().setEffectiveWeight(1).fadeIn(.18);
  action.setLoop(once?THREE.LoopOnce:THREE.LoopRepeat,once?1:Infinity);
  action.clampWhenFinished=once;action.play();nativeAction=action;elapsed=0;host.dataset.clip=name;
  return true;
 }
 function setWireframe(value){
  if(model?.userData.nativePreview)model.traverse(node=>{
   if(!node.isMesh)return;
   for(const mat of(Array.isArray(node.material)?node.material:[node.material]))
    if(mat&&'wireframe'in mat)mat.wireframe=Boolean(value);
  });
  host.dataset.wireframe=String(Boolean(value));
 }
 function resetCommonPose(){for(const joint of Object.values(joints)){joint.position.copy(joint.userData.rest);joint.rotation.set(0,0,0);}}
 function commonRot(name,x=0,y=0,z=0){const joint=joints[name];if(joint)joint.rotation.set(x*Math.PI/180,y*Math.PI/180,z*Math.PI/180,'XYZ');}
 function commonMove(name,x=0,y=0,z=0){const joint=joints[name];if(joint)joint.position.copy(joint.userData.rest).add(new THREE.Vector3(x,y,z));}
 function applyCommonMotion(atom,time){
  resetCommonPose();
  const id=atom?.atomId||'',duration=Math.max(.1,Number(atom?.duration)||1),unit=atom?.looped?(time%duration)/duration:Math.min(time/duration,1);
  const phase=unit*Math.PI*2,s=Math.sin(phase),c=Math.cos(phase),pulse=Math.sin(Math.PI*Math.min(1,unit));
  commonRot('UpperTorso',-1+s*.8,0,s*.5);commonRot('Head',1-s*.45,0,-s*.2);
  if(['WALK','JOG','RUN','SPRINT','INJURED_WALK','SLOPE_ASCEND','SLOPE_DESCEND'].includes(id)){
   const scale={WALK:24,JOG:34,RUN:43,SPRINT:54,INJURED_WALK:18,SLOPE_ASCEND:28,SLOPE_DESCEND:27}[id]||24,lean={RUN:-8,SPRINT:-13,INJURED_WALK:9,SLOPE_ASCEND:-10,SLOPE_DESCEND:7}[id]||-3;
   commonRot('LowerTorso',lean,0,s*2);commonRot('UpperTorso',-lean*.45,0,-s*3);commonMove('HumanoidRootPart',0,Math.abs(s)*.055,0);
   for(const [side,sign] of [['Left',1],['Right',-1]]){commonRot(side+'UpperLeg',c*scale*sign,0,0);commonRot(side+'LowerLeg',Math.min(0,-18-22*Math.max(0,-c*sign)),0,0);commonRot(side+'Foot',8+c*7*sign,0,0);commonRot(side+'UpperArm',-c*scale*.8*sign,0,sign*-4);commonRot(side+'LowerArm',16+8*Math.max(0,c*sign),0,0);}
   if(id==='INJURED_WALK'){commonRot('UpperTorso',10,-6,8);commonRot('LeftUpperArm',-18,0,-24);}
  }else if(id==='IDLE_RELAXED'||id==='FATIGUED_IDLE'){
   commonMove('LowerTorso',0,s*.035,0);commonRot('UpperTorso',id==='FATIGUED_IDLE'?10+s*2:1+s,0,s*.6);commonRot('Head',id==='FATIGUED_IDLE'?-8:0,0,0);commonRot('LeftUpperArm',id==='FATIGUED_IDLE'?18:-4+s*2,0,-5);commonRot('RightUpperArm',id==='FATIGUED_IDLE'?18:-4-s*2,0,5);
  }else if(id==='START'||id==='STOP'){
   const k=id==='START'?pulse:1-pulse;commonRot('LowerTorso',-12*k,0,0);commonRot('LeftUpperLeg',28*k,0,0);commonRot('RightUpperLeg',-18*k,0,0);commonRot('LeftUpperArm',-24*k,0,-5);commonRot('RightUpperArm',22*k,0,5);
  }else if(id==='TURN_90'){
   const yaw=90*Math.sin(unit*Math.PI/2);commonRot('LowerTorso',0,yaw*.5,0);commonRot('UpperTorso',0,yaw*.35,0);commonRot('Head',0,yaw*.15,0);commonRot('LeftUpperLeg',10*pulse,-yaw*.15,0);commonRot('RightUpperLeg',-8*pulse,-yaw*.15,0);
  }else if(id==='JUMP_START'||id==='LAND'){
   const k=id==='JUMP_START'?pulse:Math.sin(Math.PI*Math.min(1,unit))*1.15;commonMove('HumanoidRootPart',0,id==='JUMP_START'?pulse*.18:-pulse*.08,0);commonRot('LowerTorso',10*k,0,0);commonRot('LeftUpperLeg',30*k,0,-3);commonRot('RightUpperLeg',30*k,0,3);commonRot('LeftLowerLeg',-55*k,0,0);commonRot('RightLowerLeg',-55*k,0,0);commonRot('LeftUpperArm',-34*k,0,-10);commonRot('RightUpperArm',-34*k,0,10);
  }else if(id==='CROUCH_IDLE'){
   commonMove('HumanoidRootPart',0,-.55,0);commonRot('LowerTorso',8,0,0);commonRot('LeftUpperLeg',28+s*3,0,-3);commonRot('RightUpperLeg',28-s*3,0,3);commonRot('LeftLowerLeg',-58,0,0);commonRot('RightLowerLeg',-58,0,0);
  }else if(id.startsWith('DODGE_')){
   const sign=id.endsWith('LEFT')?-1:1;commonMove('HumanoidRootPart',sign*pulse*.55,-pulse*.18,0);commonRot('LowerTorso',10,0,-sign*28*pulse);commonRot('UpperTorso',-5,0,sign*10*pulse);commonRot('LeftUpperArm',18,0,-18);commonRot('RightUpperArm',18,0,18);
  }else if(id==='ROLL_FORWARD'){
   commonMove('HumanoidRootPart',0,-.55*pulse,-.45*pulse);commonRot('LowerTorso',360*unit,0,0);commonRot('LeftUpperLeg',45,0,-5);commonRot('RightUpperLeg',45,0,5);commonRot('LeftLowerLeg',-75,0,0);commonRot('RightLowerLeg',-75,0,0);
  }else if(['CLIMB_LOOP','LADDER_ENTER','LADDER_EXIT'].includes(id)){
   commonRot('UpperTorso',-6,0,0);commonRot('LeftUpperArm',-75*c,0,-12);commonRot('RightUpperArm',75*c,0,12);commonRot('LeftUpperLeg',38*c,0,0);commonRot('RightUpperLeg',-38*c,0,0);commonRot('LeftLowerLeg',-32-18*c,0,0);commonRot('RightLowerLeg',-32+18*c,0,0);
  }else if(id==='SWIM_FORWARD'){
   commonRot('HumanoidRootPart',72,0,0);commonRot('LeftUpperArm',-80+55*s,0,-20);commonRot('RightUpperArm',-80-55*s,0,20);commonRot('LeftUpperLeg',18*s,0,0);commonRot('RightUpperLeg',-18*s,0,0);
  }else if(['BLOCK_RAISE','BLOCK_HOLD','PARRY_PERFECT','COUNTER_READY'].includes(id)){
   const k=id==='BLOCK_RAISE'?pulse:1;commonRot('LeftUpperArm',-42*k,12,-58*k);commonRot('RightUpperArm',-55*k,-12,48*k);commonRot('LeftLowerArm',88*k,0,0);commonRot('RightLowerArm',96*k,0,0);commonRot('UpperTorso',0,-8*k,0);if(id==='PARRY_PERFECT')commonRot('UpperTorso',-8,22*pulse,0);
  }else if(id==='GUARD_BREAK'){
   commonRot('UpperTorso',22*pulse,0,10*pulse);commonRot('Head',-14*pulse,0,-8*pulse);commonRot('LeftUpperArm',55*pulse,0,-28);commonRot('RightUpperArm',48*pulse,0,30);
  }else if(['LIGHT_ATTACK_1','HEAVY_ATTACK_1','GATHER_SWING','FARM_TEND'].includes(id)){
   const heavy=id==='HEAVY_ATTACK_1',arc=Math.sin(Math.PI*Math.min(1,unit))*(heavy?105:82);commonRot('LowerTorso',heavy?-10*pulse:-5*pulse,-28*pulse,0);commonRot('UpperTorso',heavy?14*pulse:8*pulse,35*pulse,0);commonRot('RightUpperArm',-35+arc,0,28);commonRot('RightLowerArm',30+arc*.3,0,4);commonRot('LeftUpperArm',-18-arc*.25,0,-18);
  }else if(id==='RANGED_DRAW_SHOT'){
   commonRot('LeftUpperArm',-72,0,-58);commonRot('LeftLowerArm',32,0,0);commonRot('RightUpperArm',-62,0,62);commonRot('RightLowerArm',105-60*pulse,0,0);commonRot('UpperTorso',0,-18,0);
  }else if(['CAST_BURST','CHANNEL_LOOP'].includes(id)){
   const k=id==='CHANNEL_LOOP'?.75+.25*s:pulse;commonRot('LeftUpperArm',-65*k,0,-55);commonRot('RightUpperArm',-65*k,0,55);commonRot('LeftLowerArm',20,0,0);commonRot('RightLowerArm',20,0,0);commonRot('UpperTorso',-6*k,0,0);commonMove('HumanoidRootPart',0,Math.max(0,k)*.06,0);
  }else if(['HIT_FRONT','HIT_BACK'].includes(id)){
   const sign=id==='HIT_FRONT'?1:-1;commonRot('UpperTorso',sign*28*pulse,-8*pulse,12*pulse);commonRot('Head',sign*-18*pulse,6*pulse,-10*pulse);commonRot('LeftUpperArm',18*pulse,0,-22);commonRot('RightUpperArm',28*pulse,0,24);
  }else if(id==='DEATH_FRONT'||id==='DOWNED_IDLE'){
   const k=id==='DOWNED_IDLE'?1:Math.sin(Math.min(1,unit)*Math.PI/2);commonMove('HumanoidRootPart',0,-1.55*k,-.35*k);commonRot('HumanoidRootPart',78*k,0,0);commonRot('LeftUpperArm',22,0,-16);commonRot('RightUpperArm',35,0,18);commonRot('LeftUpperLeg',18,0,-5);commonRot('RightUpperLeg',26,0,8);
  }else if(id==='REVIVE_HELP'){
   commonMove('HumanoidRootPart',0,-.45*pulse,0);commonRot('LowerTorso',16*pulse,0,0);commonRot('LeftUpperLeg',24*pulse,0,-3);commonRot('RightUpperLeg',36*pulse,0,4);commonRot('LeftLowerLeg',-48*pulse,0,0);commonRot('RightLowerLeg',-62*pulse,0,0);commonRot('RightUpperArm',-55*pulse,0,35);
  }else if(id==='EMOTE_WAVE'||id==='TALK_GESTURE'){
   commonRot('RightUpperArm',-72,0,62);commonRot('RightLowerArm',78,0,0);commonRot('RightHand',0,0,22*s);if(id==='TALK_GESTURE')commonRot('LeftUpperArm',-18+8*s,0,-22);
  }else if(['SIT_DOWN','STAND_UP','BED_LIE_DOWN'].includes(id)){
   const k=id==='STAND_UP'?1-pulse:pulse;commonMove('HumanoidRootPart',0,-.85*k,id==='BED_LIE_DOWN'?.15*k:0);commonRot('LowerTorso',id==='BED_LIE_DOWN'?70*k:8*k,0,0);commonRot('LeftUpperLeg',70*k,0,-3);commonRot('RightUpperLeg',70*k,0,3);commonRot('LeftLowerLeg',-72*k,0,0);commonRot('RightLowerLeg',-72*k,0,0);
  }else if(id==='LEAN_WALL_IDLE'){
   commonMove('HumanoidRootPart',0,0,.16);commonRot('LowerTorso',0,0,-7);commonRot('UpperTorso',-5,0,8);commonRot('LeftUpperLeg',-7,0,0);commonRot('RightUpperLeg',12,0,0);
  }else if(['PUSH_OBJECT','PULL_OBJECT'].includes(id)){
   const sign=id==='PUSH_OBJECT'?-1:1;commonRot('LowerTorso',sign*16,0,0);commonRot('UpperTorso',sign*-7,0,0);commonRot('LeftUpperArm',-78+8*s,0,-10);commonRot('RightUpperArm',-78-8*s,0,10);commonRot('LeftLowerArm',12,0,0);commonRot('RightLowerArm',12,0,0);
  }else if(['PICKUP_GROUND','PLACE_GROUND','OPEN_CONTAINER','OPEN_DOOR','INTERACT_USE','USE_CONSUMABLE','EQUIP_DRAW','UNEQUIP_STOW','CRAFT_LOOP','NPC_WORK_LOOP','COOK_LOOP','FISH_CAST'].includes(id)){
   commonRot('LowerTorso',12*pulse,0,0);commonRot('RightUpperArm',-22-58*pulse,0,24);commonRot('RightLowerArm',32+55*pulse,0,0);commonRot('LeftUpperArm',-10-28*pulse,0,-18);commonRot('LeftLowerArm',18+30*pulse,0,0);
  }else if(id==='CARRY_IDLE'){
   commonRot('LeftUpperArm',-38,0,-24);commonRot('RightUpperArm',-38,0,24);commonRot('LeftLowerArm',85,0,0);commonRot('RightLowerArm',85,0,0);
  }else if(id==='BLEND_NEUTRAL'){
   commonRot('UpperTorso',-3+6*pulse,0,0);commonRot('LeftUpperArm',-8+8*pulse,0,-4);commonRot('RightUpperArm',-8+8*pulse,0,4);
  }
 }
 function setCommonMotion(atom){setModel({id:'roblox-common-r15-preview',model:COMMON_R15_RECIPE,boneNames:[],clips:[]},false);commonMotion=atom||null;elapsed=0;host.dataset.asset=atom?.atomId||'COMMON_R15';host.dataset.kind='common';host.dataset.clip=atom?.atomId||'';}
 function selectClip(id){commonMotion=null;clip=entry?.clips?.find(row=>row.id===id)||null;elapsed=0;host.dataset.clip=clip?.id||'';}
 function resize(){const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);renderer.setSize(w,h,false);renderer.setViewport(0,0,w,h);camera.aspect=w/h;camera.updateProjectionMatrix();}
 new ResizeObserver(resize).observe(host);resize();
 new IntersectionObserver(([row])=>{visible=row.isIntersecting;},{threshold:.01}).observe(host);
 let last=performance.now();
 renderer.setAnimationLoop(now=>{
  const dt=Math.max(0,Math.min((now-last)/1000,.1));last=now;if(document.hidden||!visible)return;
  if(!paused){elapsed+=dt*speed;if(nativeMixer)nativeMixer.update(dt*speed);}
  if(commonMotion)applyCommonMotion(commonMotion,elapsed);
  if(clip){
   const t=clip.loop?elapsed%clip.duration:Math.min(elapsed,clip.duration),samples=clip.frames;
   const frame=t/clip.duration*(samples.length-1),lo=Math.floor(frame),hi=Math.min(samples.length-1,lo+1),mix=frame-lo;
   entry.boneNames.forEach((name,i)=>{
    const a=samples[lo][i],b=samples[hi][i];
    const p=a.map((x,j)=>{let delta=b[j]-x;if(j>=3)delta=Math.atan2(Math.sin(delta),Math.cos(delta));return x+delta*mix;});
    joints[name].position.copy(joints[name].userData.rest).add(new THREE.Vector3(p[0],p[1],p[2]));
    joints[name].rotation.set(p[3],p[4],p[5],'XYZ');
   });
  }
  const distance=extent/(2*Math.tan(34*Math.PI/360))*Math.max(1,1/camera.aspect)*zoom;
  const yaw=angle*Math.PI/180+.25;
  camera.position.copy(center).add(new THREE.Vector3(Math.sin(yaw)*distance,distance*(host.dataset.kind==='native'?pitch:host.dataset.kind==='environment'?.8:.13),-Math.cos(yaw)*distance));camera.lookAt(center);
  renderer.render(scene,camera);host.dataset.frame=String(Math.floor(elapsed*60));
 });
 // 입력: 한 손가락 드래그 회전, 두 손가락 핀치 확대, 휠 확대.
 const pointers=new Map();let pinch=0;
 renderer.domElement.style.touchAction='none';
 renderer.domElement.addEventListener('pointerdown',event=>{
  if(host.dataset.kind!=='native')return;
  pointers.set(event.pointerId,[event.clientX,event.clientY]);
  renderer.domElement.setPointerCapture?.(event.pointerId);pinch=0;
 });
 renderer.domElement.addEventListener('pointermove',event=>{
  if(host.dataset.kind!=='native'||!pointers.has(event.pointerId))return;
  const old=pointers.get(event.pointerId);pointers.set(event.pointerId,[event.clientX,event.clientY]);
  if(pointers.size===1){angle+=(event.clientX-old[0])*.35;pitch=Math.max(-.6,Math.min(.85,pitch-(event.clientY-old[1])*.006));}
  else if(pointers.size===2){const [a,b]=[...pointers.values()],span=Math.hypot(a[0]-b[0],a[1]-b[1]);if(pinch>0)zoom=Math.max(.6,Math.min(3,zoom*pinch/Math.max(1,span)));pinch=span;}
 });
 for(const type of ['pointerup','pointercancel','lostpointercapture'])renderer.domElement.addEventListener(type,event=>{pointers.delete(event.pointerId);pinch=0;});
 renderer.domElement.addEventListener('wheel',event=>{if(host.dataset.kind!=='native')return;event.preventDefault();zoom=Math.max(.6,Math.min(3,zoom*Math.exp(event.deltaY*.001)));},{passive:false});
 renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();renderer.setAnimationLoop(null);host.dispatchEvent(new Event('previewlost'));});
 host.dataset.renderer=software?'canvas':'webgl';
 return {setModel,setGLB,setCommonMotion,selectClip,selectNativeClip,setWireframe,cancelLoad:()=>{++loadRevision;},
  setPaused:value=>{paused=value;},setSpeed:value=>{speed=value;},setAngle:value=>{angle=value;},
  replay:()=>{elapsed=0;if(nativeAction){nativeAction.reset();nativeAction.play();}}};
}
