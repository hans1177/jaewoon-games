// Wild Forest native scenery. Uses only checked-in, CC0-ledgered Tiny Treats OBJ/MTL sources.
// Gameplay state/coordinates and original item interaction rules are never changed.
const SOURCE=new URL('../../assets/shared/homely-house/',import.meta.url);
const ORIGINALS=Object.freeze(['tree','tree_large','foliage_A','foliage_B','house','bench_A']);
function random(seed){
  let x=seed|0;
  return ()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296;};
}
function parseNativeObj(THREE,src,mtl,name){
  if(!src.includes('\nv ')||!src.includes('\nf '))throw Error('Missing original OBJ vertices/faces: '+name);
  const kd=mtl.match(/(?:^|\n)\s*Kd\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/);
  if(!kd)throw Error('Missing original CC0 MTL material: '+name);
  const sourceColor=new THREE.Color().setRGB(...kd.slice(1,4).map(Number));
  const input=[],output=[],colors=[];
  for(const row of src.split(/\r?\n/)){
    if(row.startsWith('v ')){
      const p=row.slice(2).trim().split(/\s+/).slice(0,3).map(Number);
      if(p.length===3&&p.every(Number.isFinite))input.push(p);
    }else if(row.startsWith('f ')){
      const indices=row.slice(2).trim().split(/\s+/).map(v=>Number(v.split('/')[0]));
      if(indices.length<3||indices.length>12)continue;
      const points=indices.map(n=>input[n>0?n-1:input.length+n]);
      if(points.some(p=>!p))throw Error('Broken native OBJ face: '+name);
      for(let t=1;t<points.length-1;t++){
        const tri=[points[0],points[t],points[t+1]];
        for(const p of tri){
          output.push(...p);
          const original=sourceColor.clone();
          // Readability adaptation on the original licensed vertices; NO generated model.
          if(name==='tree'||name==='tree_large'){
            if(p[1]<.90)original.set('#73513a');
            else original.multiplyScalar(.73+(Math.sin(p[0]*4+p[1]*3+p[2]*7)*.08));
          }else if(name.startsWith('foliage'))original.multiplyScalar(.80+(Math.sin(p[0]*12+p[2]*7)*.07));
          colors.push(original.r,original.g,original.b);
        }
      }
    }
  }
  if(output.length<9)throw Error('Native OBJ is empty: '+name);
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(output,3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  const bounds=geometry.boundingBox;
  geometry.translate(-(bounds.min.x+bounds.max.x)*.5,-bounds.min.y,-(bounds.min.z+bounds.max.z)*.5);
  geometry.computeBoundingSphere();
  return {
    geometry,
    material:new THREE.MeshStandardMaterial({vertexColors:true,roughness:.93,metalness:0,side:THREE.DoubleSide,flatShading:true}),
    sourceHeight:Math.max(.05,bounds.max.y-bounds.min.y)
  };
}
async function readModel(THREE,name){
  const [obj,mtl]=await Promise.all([fetch(new URL(name+'.obj',SOURCE),{cache:'force-cache'}),fetch(new URL(name+'.mtl',SOURCE),{cache:'force-cache'})]);
  if(!obj.ok||!mtl.ok)throw Error('CC0 3D source fetch failed '+name+': '+obj.status+'/'+mtl.status);
  return parseNativeObj(THREE,await obj.text(),await mtl.text(),name);
}
function put(THREE,parent,source,targetHeight){
  const instance=new THREE.Mesh(source.geometry,source.material);
  instance.scale.setScalar(targetHeight/source.sourceHeight);
  instance.castShadow=true;
  instance.receiveShadow=true;
  parent.add(instance);
  return instance;
}
function instanced(THREE,world,source,count,placements,targetHeight){
  if(!count)return null;
  const model=new THREE.InstancedMesh(source.geometry,source.material,count);
  const dummy=new THREE.Object3D();
  for(let i=0;i<count;i++){
    const v=placements[i];
    const scale=(targetHeight/source.sourceHeight)*v.size;
    dummy.position.set(v.x,0,v.z);
    dummy.rotation.set(0,v.yaw,0);
    dummy.scale.set(scale,scale,scale);
    dummy.updateMatrix();
    model.setMatrixAt(i,dummy.matrix);
  }
  model.instanceMatrix.needsUpdate=true;
  model.castShadow=false;model.receiveShadow=true;
  model.computeBoundingSphere();
  world.add(model);
  return model;
}
export async function attachWildNativeScenery({THREE,world,WORLD,SCALE,resources,props,tent}){
  const content=await Promise.all(ORIGINALS.map(async name=>[name,await readModel(THREE,name)]));
  const models=new Map(content);
  let applied=0;
  // Original harvestable nodes keep their exact world positions and depletion rules.
  resources.forEach((r,index)=>{
    const modelName=r.type==='tree'?(index%3===0?'tree_large':'tree'):
      r.type==='fiber'?'foliage_A':r.type==='berry'?'foliage_B':null;
    if(!modelName)return;
    const g=props[index];if(!g)return;
    const model=models.get(modelName);
    if(!model)return;
    const native=put(THREE,g,model,r.type==='tree'?(modelName==='tree_large'?6.3:4.9):1.25);
    native.rotation.y=(index*2.399963)%6.283;
    // Only the visual is replaced. The original node object and hitbox are untouched.
    for(const old of g.children)if(old!==native)old.visible=false;
    applied++;
  });
  const rng=random(20261020);
  const mobile=matchMedia('(pointer:coarse)').matches||navigator.deviceMemory<=4;
  const bLimit=mobile?190:340,youngLimit=mobile?70:140;
  const bushes=[],saplings=[];
  // Scenic foliage is purposefully shorter than harvestable trees and cannot be gathered.
  // This prevents deception about which original resources can be interacted with.
  for(let i=0;i<bLimit+youngLimit;i++){
    const x=110+rng()*(WORLD.w-220),y=100+rng()*(WORLD.h-200);
    if(Math.abs(y-(WORLD.riverY+WORLD.riverH*.5))<WORLD.riverH*.5+35)continue;
    if(Math.hypot(x-480,y-560)<95)continue; // preserve spawn and movement clearance
    const entry={x:x/SCALE,z:y/SCALE,size:.72+rng()*.78,yaw:rng()*Math.PI*2};
    if(i<bLimit)bushes.push(entry);else saplings.push({...entry,size:entry.size*.73});
  }
  instanced(THREE,world,models.get('foliage_A'),bushes.length,bushes,.85);
  instanced(THREE,world,models.get('tree'),saplings.length,saplings,3.1);
  const builtHome=new THREE.Group();
  put(THREE,builtHome,models.get('house'),4.8);
  builtHome.visible=false;
  world.add(builtHome);
  const campBench=new THREE.Group();
  put(THREE,campBench,models.get('bench_A'),1.05);
  campBench.visible=false;
  world.add(campBench);
  document.body.dataset.nativeForestAssets='loaded';
  document.body.dataset.nativeForestSourceCount=String(models.size);
  document.body.dataset.nativeForestBoundNodes=String(applied);
  document.body.dataset.nativeForestDecorCount=String(bushes.length+saplings.length);
  return {
    update(camp){
      const enabled=!!camp?.shelter&&Number.isFinite(camp.x)&&Number.isFinite(camp.y);
      const firm=enabled&&camp.shelter>=2;
      builtHome.visible=firm;
      campBench.visible=enabled;
      if(firm){builtHome.position.set(camp.x/SCALE,0,camp.y/SCALE);tent.visible=false;}
      if(enabled)campBench.position.set(camp.x/SCALE+2.75,0,camp.y/SCALE+1.0);
    }
  };
}
