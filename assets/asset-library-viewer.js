import * as THREE from '/assets/roblox/world-ghosts/native/mesh/three/three.module.js';
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

 renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setClearColor(0x0d1821);
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
 let model=null,materials=[],joints={},entry=null,clip=null,center=new THREE.Vector3(),extent=6;
 let elapsed=0,angle=0,speed=1,paused=matchMedia('(prefers-reduced-motion:reduce)').matches,visible=true;
 function setModel(row,environment=false){
  if(model)scene.remove(model);for(const material of materials)material.dispose();
  model=new THREE.Group();materials=[];joints={};entry=row;clip=null;elapsed=0;
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
  host.dataset.asset=row.id;host.dataset.kind=environment?'environment':'monster';host.dataset.loaded='true';
 }
 function selectClip(id){clip=entry?.clips?.find(row=>row.id===id)||null;elapsed=0;host.dataset.clip=clip?.id||'';}
 function resize(){const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h,false);renderer.setViewport(0,0,w,h);camera.aspect=w/h;camera.updateProjectionMatrix();}
 new ResizeObserver(resize).observe(host);resize();
 new IntersectionObserver(([row])=>{visible=row.isIntersecting;},{threshold:.01}).observe(host);
 let last=performance.now();
 renderer.setAnimationLoop(now=>{
  const dt=Math.max(0,Math.min((now-last)/1000,.1));last=now;if(document.hidden||!visible)return;
  if(!paused)elapsed+=dt*speed;
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
  const distance=extent/(2*Math.tan(34*Math.PI/360))*Math.max(1,1/camera.aspect);
  const yaw=angle*Math.PI/180+.25;
  camera.position.copy(center).add(new THREE.Vector3(Math.sin(yaw)*distance,distance*(host.dataset.kind==='environment'?.8:.13),-Math.cos(yaw)*distance));camera.lookAt(center);
  renderer.render(scene,camera);host.dataset.frame=String(Math.floor(elapsed*60));
 });
 renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();renderer.setAnimationLoop(null);host.dispatchEvent(new Event('previewlost'));});
 host.dataset.renderer=software?'canvas':'webgl';
 return {setModel,selectClip,setPaused:value=>{paused=value;},setSpeed:value=>{speed=value;},setAngle:value=>{angle=value;},replay:()=>{elapsed=0;}};
}
