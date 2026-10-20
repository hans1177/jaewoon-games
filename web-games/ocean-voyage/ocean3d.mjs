// 파일명: web-games/ocean-voyage/ocean3d.mjs
// 임포트: 검증된 Three.js와 Kenney CC0 원본 GLB. 게임 규칙은 engine.mjs에서만 관리한다.
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {PORTS} from './engine.mjs';
const ROOT='./assets/';
const MODELS={
 ship:'ship-medium',escort:'ship-small',frigate:'ship-large',
 pirate:'ship-pirate-medium',smallPirate:'ship-pirate-small',
 dock:'structure-platform-dock',building:'structure',
 palm:'palm-detailed-straight',sand:'patch-sand',cannon:'cannon',chest:'chest'
};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const loader=new GLTFLoader();
const paint=new Map();
function getModel(name){
 if(!paint.has(name)){
  paint.set(name,new Promise((resolve,reject)=>{
   loader.load(ROOT+MODELS[name]+'.glb',g=>{
    const root=g.scene;
    root.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=true;}});
    resolve(root);
   },undefined,reject);
  }));
 }
 return paint.get(name);
}
function instance(model,scale=1){
 const obj=model.clone(true),box=new THREE.Box3().setFromObject(obj),size=box.getSize(new THREE.Vector3());
 const base=10/Math.max(1,size.y,size.x*.8,size.z*.6)*scale;
 obj.scale.setScalar(base);
 const center=box.getCenter(new THREE.Vector3());
 obj.position.set(-center.x*base,-box.min.y*base,-center.z*base);
 const group=new THREE.Group();group.add(obj);return group;
}
export function createOcean3D(canvas,{onReady=()=>{},onError=()=>{}}={}){
 const renderer=new THREE.WebGLRenderer({canvas,alpha:false,antialias:true,powerPreference:'high-performance'});
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.55));
 renderer.setClearColor(0x9ec0c9);
 const scene=new THREE.Scene();
 scene.fog=new THREE.FogExp2(0x9bbcc5,.0026);
 const camera=new THREE.PerspectiveCamera(50,1,.4,1100);
 scene.add(new THREE.HemisphereLight(0xd6efff,0x527b69,2));
 const sun=new THREE.DirectionalLight(0xffe3ab,2.3);sun.position.set(-50,105,-75);scene.add(sun);
 const seaMaterial=new THREE.MeshPhysicalMaterial({color:0x286e83,roughness:.34,metalness:.12,clearcoat:.7,clearcoatRoughness:.2,flatShading:false});
 const sea=new THREE.Mesh(new THREE.PlaneGeometry(560,560,6,6),seaMaterial);
 sea.rotation.x=-Math.PI/2;sea.position.y=-.9;sea.receiveShadow=true;scene.add(sea);
 const floor=new THREE.Mesh(new THREE.CircleGeometry(235,80),new THREE.MeshBasicMaterial({color:0x3c8fa4,transparent:true,opacity:.11,depthWrite:false}));
 floor.rotation.x=-Math.PI/2;floor.position.y=-.78;scene.add(floor);
 // 항구/선박의 메시 원본은 전부 외부 CC0 라이브러리에서만 불러온다.
 const portsGroup=new THREE.Group(),boatsGroup=new THREE.Group();scene.add(portsGroup,boatsGroup);
 const markerMaterial=new THREE.MeshBasicMaterial({color:0xffde8b,transparent:true,opacity:.68,side:THREE.DoubleSide});
 const portMap=new Map(),enemies=new Map();
 for(const p of PORTS){
  const base=new THREE.Group();base.position.set(p.x,0,p.z);portsGroup.add(base);
  const mark=new THREE.Mesh(new THREE.RingGeometry(6.5,7,42),markerMaterial);mark.rotation.x=-Math.PI/2;mark.position.y=.16;base.add(mark);
  portMap.set(p.id,base);
 }
 let ship=null,escort=null,frigate=null,playerModel=null,pirateModel=null,smallPirateModel=null;
 const lineMat=new THREE.LineDashedMaterial({color:0xffd998,transparent:true,opacity:.85,dashSize:2,gapSize:1});
 let course=null,lastCourseAt=0,courseTarget='',disposed=false,ready=false,latest=null,quality='balanced';
 const load=async()=>{
  try{
   const models=await Promise.all(['ship','escort','frigate','pirate','smallPirate','dock','building','palm','sand','cannon','chest'].map(getModel));
   if(disposed)return;
   const m=Object.fromEntries(['ship','escort','frigate','pirate','smallPirate','dock','building','palm','sand','cannon','chest'].map((k,i)=>[k,models[i]]));
   playerModel=m.ship;pirateModel=m.pirate;smallPirateModel=m.smallPirate;
   ship=instance(m.ship,1.05);boatsGroup.add(ship);
   escort=instance(m.escort,.7);boatsGroup.add(escort);
   frigate=instance(m.frigate,.84);boatsGroup.add(frigate);
   for(const p of PORTS){
    const root=portMap.get(p.id),southern=['gold','sun'].includes(p.id);
    // Region-specific harbor silhouettes use only the existing Kenney CC0 GLBs.
    // Northern England/Netherlands receive dense timber dockyards instead of tropical palms.
    const decor=[['sand',0,0,4.2],['sand',-6,3,3.2],['sand',5,-2,2.9],['building',0,1,.9],['dock',3,7,.95],
      ['cannon',4,-3,.35],['chest',2,3,.4],
      ...(southern?[['palm',-5,-3,.85],['palm',6,-2,.9]]:[['building',-6,-3,.64],['dock',-3,-7,.64]])];
    const tint=p.id==='dawn'||p.id==='coral'||p.id==='north'?0x8199ae:
      p.id==='gold'||p.id==='sun'?0xe3bf8d:p.id==='jade'||p.id==='amber'?0xafbfa7:0xd1b3a7;
    for(const [key,x,z,scale] of decor){
     const object=instance(m[key],scale);object.position.set(x,key==='sand'?-1.4:0,z);
     if(key==='building'||key==='dock'){
      object.traverse(part=>{if(!part.isMesh||!part.material)return;
       part.material=Array.isArray(part.material)?part.material.map(mat=>mat.clone()):part.material.clone();
       const mats=Array.isArray(part.material)?part.material:[part.material];
       for(const mat of mats)if(mat.color)mat.color.lerp(new THREE.Color(tint),.20);
      });
     }
     root.add(object);
    }
   }
   ready=true;onReady();if(latest)update(latest);
  }catch(e){if(!disposed)onError('외부 3D 모델 로딩 실패: '+e.message);}
 };
 load();
 function update(s){
  latest=s;if(!ready)return;
  const pos=s.ship;
  ship.position.set(pos.x,0,pos.z);ship.rotation.y=pos.heading;
  escort.visible=s.fleet>=2;escort.position.set(pos.x-Math.cos(pos.heading)*9,0,pos.z+Math.sin(pos.heading)*9-7);escort.rotation.y=pos.heading;
  frigate.visible=s.fleet>=3;frigate.position.set(pos.x+Math.cos(pos.heading)*11,0,pos.z-Math.sin(pos.heading)*11-10);frigate.rotation.y=pos.heading;
  const seen=new Set();
  for(const p of s.pirates){
   if(p.hull<=0)continue;
   let object=enemies.get(p.id);
   if(!object){object=instance(p.id%2?pirateModel:smallPirateModel,.9);boatsGroup.add(object);enemies.set(p.id,object);}
   object.visible=true;object.position.set(p.x,0,p.z);object.rotation.y=p.heading;seen.add(p.id);
  }
  for(const [id,obj] of enemies)if(!seen.has(id))obj.visible=false;
  // Rebuild guide geometry only on route change or at 3Hz, not every rendered frame.
  const courseKey=s.route?.length?JSON.stringify([s.destination,s.route.length,s.route[0],s.route.at(-1)]):'';
  if(courseKey!==courseTarget||performance.now()-lastCourseAt>330){
   courseTarget=courseKey;lastCourseAt=performance.now();
   if(course){scene.remove(course);course.geometry.dispose();course=null;}
   if(s.route?.length){
    const points=[new THREE.Vector3(pos.x,.36,pos.z),...s.route.map(p=>new THREE.Vector3(p.x,.36,p.z))];
    course=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),lineMat);
    course.computeLineDistances();scene.add(course);
   }
  }
  for(const p of PORTS)portMap.get(p.id).visible=true;
 }
 let frame=0,zoom=72;
 const clock=new THREE.Clock();
 function resize(){
  const w=canvas.clientWidth||innerWidth,h=canvas.clientHeight||innerHeight;
  if(canvas.width!==Math.round(w*renderer.getPixelRatio())||canvas.height!==Math.round(h*renderer.getPixelRatio())){
   renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
  }
 }
 function animate(){
  if(disposed)return;frame=requestAnimationFrame(animate);resize();
  const dt=clock.getDelta(),t=clock.elapsedTime,s=latest;
  if(ship&&s){
   ship.position.y=Math.sin(t*1.4)*.26;
   if(escort.visible)escort.position.y=Math.sin(t*1.5+1)*.22;
   if(frigate.visible)frigate.position.y=Math.sin(t*1.4+2)*.22;
   const zoomOffset=matchMedia('(max-width:680px)').matches?1.5:1;
   const target=new THREE.Vector3(s.ship.x+zoom*zoomOffset*.62,zoom*zoomOffset,s.ship.z+zoom*zoomOffset*.78);
   camera.position.lerp(target,clamp(dt*2.2,.01,.24));
   camera.lookAt(s.ship.x,0,s.ship.z);
  }else{camera.position.set(90,120,115);camera.lookAt(0,0,0);}
  // Two supplied built-in Three.js materials, no custom handmade model or shadow pipeline.
  sea.material.color.setHSL(.54+Math.sin(t*.07)*.01,.49,.32);
  renderer.render(scene,camera);
 }
 animate();
 return {
  setState:update,
  setQuality(level){
   quality=level==='low'?'low':'balanced';
   renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,quality==='low'?1:1.55));
   scene.fog.density=quality==='low'?.0032:.0026;
  },
  setZoom(value){zoom=clamp(Number(value)||72,40,135);},
  dispose(){disposed=true;cancelAnimationFrame(frame);renderer.dispose();lineMat.dispose();sea.geometry.dispose();}
 };
}
