// Native geometry-only art layer for the real Wild Forest THREE/WebGL scene.
// Gameplay, combat, collision, saves, animal AI and weather remain in index.html.
export function createForestDetail({THREE,scene,world,WORLD,SCALE,mat,renderer,sun,ground,river}){
  const rng=(seed)=>()=>((seed=(Math.imul(seed,1664525)+1013904223)|0)>>>0)/4294967296;
  const random=rng(20261020);
  const mobile=matchMedia('(pointer:coarse)').matches||(navigator.deviceMemory||4)<=3;
  const budget=mobile?800:1700;
  // Four-sided, physically three-dimensional grass patches, not screen sprites.
  const blade=new THREE.BufferGeometry();
  blade.setAttribute('position',new THREE.Float32BufferAttribute([
    -.16,0,0,-.03,.63,0,.08,0,0,
    0,0,-.15,.02,.46,.05,0,0,.12,
    -.10,0,.12,.03,.55,-.08,.13,0,.12
  ],3));
  blade.computeVertexNormals();
  const grassMat=new THREE.MeshStandardMaterial({color:'#d9dfa6',side:THREE.DoubleSide,roughness:1});
  const grass=new THREE.InstancedMesh(blade,grassMat,budget);
  grass.name='WildForestNative3DGrass';
  grass.frustumCulled=false;
  const dummy=new THREE.Object3D(),tone=new THREE.Color();
  const grassPalette=['#4d864c','#6a9850','#7a9656','#557d47'];
  for(let i=0;i<budget;i++){
    const x=50+random()*(WORLD.w-100),y=50+random()*(WORLD.h-100);
    dummy.position.set(x/SCALE,.01,y/SCALE);
    dummy.rotation.y=random()*Math.PI*2;
    const scale=.45+random()*.72;
    dummy.scale.set(scale,scale*(.60+random()*.7),scale);
    dummy.updateMatrix();
    grass.setMatrixAt(i,dummy.matrix);
    tone.set(grassPalette[i%4]).multiplyScalar(.85+random()*.18);
    grass.setColorAt(i,tone);
  }
  grass.instanceMatrix.needsUpdate=true;
  if(grass.instanceColor)grass.instanceColor.needsUpdate=true;
  world.add(grass);

  const flowerCount=mobile?90:240;
  const flowerGeo=new THREE.BufferGeometry();
  flowerGeo.setAttribute('position',new THREE.Float32BufferAttribute([
    -.12,0,0,0,.51,0,.12,0,0,
    0,0,-.12,0,.51,0,0,0,.12
  ],3));
  flowerGeo.computeVertexNormals();
  const flowers=new THREE.InstancedMesh(flowerGeo,
    new THREE.MeshStandardMaterial({color:'#eddfbb',side:THREE.DoubleSide,roughness:1}),
    flowerCount);
  flowers.name='WildForestNative3DWildflowers';flowers.frustumCulled=false;
  const flowerPalette=['#ecb5be','#eed899','#b3bee4','#f3e8c7'];
  for(let i=0;i<flowerCount;i++){
    const x=random()*WORLD.w,y=random()*WORLD.h;
    dummy.position.set(x/SCALE,.01,y/SCALE);
    dummy.rotation.y=random()*Math.PI*2;
    dummy.scale.setScalar(.5+random()*1.1);
    dummy.updateMatrix();flowers.setMatrixAt(i,dummy.matrix);
    flowers.setColorAt(i,new THREE.Color(flowerPalette[i%4]));
  }
  flowers.instanceMatrix.needsUpdate=true;
  if(flowers.instanceColor)flowers.instanceColor.needsUpdate=true;
  world.add(flowers);

  const pebbleCount=mobile?95:260;
  const pebbles=new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1,0),
    new THREE.MeshStandardMaterial({color:'#c5bda6',roughness:1}),pebbleCount);
  pebbles.name='WildForestNative3DRiverStones';
  const pebblePalette=['#89988b','#beb6a0','#8c8e7d','#6f8276'];
  for(let i=0;i<pebbleCount;i++){
    const x=random()*WORLD.w;
    const y=i%3?((i%2?WORLD.riverY-27:WORLD.riverY+WORLD.riverH+27)+random()*75-35):random()*WORLD.h;
    dummy.position.set(x/SCALE,.04,y/SCALE);
    dummy.rotation.set(random()*.2,random()*Math.PI*2,random()*.2);
    const radius=.08+random()*.18;
    dummy.scale.set(radius,radius*.35,radius*.77);
    dummy.updateMatrix();pebbles.setMatrixAt(i,dummy.matrix);
    pebbles.setColorAt(i,new THREE.Color(pebblePalette[i%4]));
  }
  pebbles.instanceMatrix.needsUpdate=true;
  if(pebbles.instanceColor)pebbles.instanceColor.needsUpdate=true;
  world.add(pebbles);

  // Actual GLSL surface shading on THREE.MeshStandardMaterial (no Canvas2D).
  mat.ground.onBeforeCompile=shader=>{
    shader.vertexShader=shader.vertexShader
      .replace('#include <common>','#include <common>\nvarying vec2 vForestSurfaceUv;')
      .replace('#include <uv_vertex>','#include <uv_vertex>\nvForestSurfaceUv=uv;');
    shader.fragmentShader=shader.fragmentShader
      .replace('#include <common>','#include <common>\nvarying vec2 vForestSurfaceUv;\nfloat forestHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}\nfloat forestNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(forestHash(i),forestHash(i+vec2(1.,0.)),f.x),mix(forestHash(i+vec2(0.,1.)),forestHash(i+vec2(1.,1.)),f.x),f.y);}')
      .replace('#include <map_fragment>','#include <map_fragment>\nfloat broad=forestNoise(vForestSurfaceUv*67.0),detail=forestNoise(vForestSurfaceUv*600.0);diffuseColor.rgb*=mix(vec3(.59,.74,.50),vec3(1.08,1.06,.81),broad*.65+detail*.35);');
  };
  mat.ground.customProgramCacheKey=()=> 'wild-forest-biome-ground-v2';
  mat.ground.needsUpdate=true;
  const waterTime={value:0};
  mat.water.onBeforeCompile=shader=>{
    shader.uniforms.forestWaterTime=waterTime;
    shader.vertexShader=shader.vertexShader
      .replace('#include <common>','#include <common>\nvarying vec2 vForestRiverUv;')
      .replace('#include <uv_vertex>','#include <uv_vertex>\nvForestRiverUv=uv;');
    shader.fragmentShader=shader.fragmentShader
      .replace('#include <common>','#include <common>\nvarying vec2 vForestRiverUv;\nuniform float forestWaterTime;')
      .replace('#include <map_fragment>','#include <map_fragment>\nfloat ripple=sin(vForestRiverUv.x*185.0+forestWaterTime*1.1+sin(vForestRiverUv.y*27.0+forestWaterTime));ripple+=.5*sin(vForestRiverUv.x*98.0+vForestRiverUv.y*22.0-forestWaterTime*.7);diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.38,.69,.75),clamp(.17+.13*ripple,0.,.4));');
  };
  mat.water.customProgramCacheKey=()=> 'wild-forest-animated-river-v2';
  mat.water.needsUpdate=true;

  const shadowMaterial=new THREE.MeshBasicMaterial({
    color:'#153127',transparent:true,opacity:.22,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1
  });
  const shadowGeometry=new THREE.CircleGeometry(1,22);
  function contact(parent,radius=1){
    const shape=new THREE.Mesh(shadowGeometry,shadowMaterial);
    shape.rotation.x=-Math.PI/2;
    shape.position.y=.015;
    shape.scale.set(radius,radius*.6,1);
    shape.renderOrder=1;
    parent.add(shape);
    return shape;
  }
  const mapShadows=!mobile;
  if(mapShadows){
    renderer.shadowMap.enabled=true;
    renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    sun.castShadow=true;
    sun.shadow.mapSize.set(1024,1024);
    sun.shadow.camera.left=-16;sun.shadow.camera.right=16;
    sun.shadow.camera.top=16;sun.shadow.camera.bottom=-16;
    sun.shadow.camera.near=.5;sun.shadow.camera.far=80;
    sun.shadow.bias=-.0003;sun.shadow.normalBias=.024;
  }
  ground.receiveShadow=mapShadows;
  river.receiveShadow=false;
  scene.add(sun.target);
  let previousX=NaN,previousZ=NaN;
  function update(S,p,now){
    waterTime.value=now*.001;
    if(mapShadows&&(Math.abs(previousX-p.x)>.25||Math.abs(previousZ-p.y)>.25)){
      const px=p.x/SCALE,pz=p.y/SCALE;
      sun.position.set(px-16,26,pz-15);
      sun.target.position.set(px,0,pz);
      sun.target.updateMatrixWorld();
      previousX=p.x;previousZ=p.y;
    }
    document.body.dataset.forestDetail='native-3d';
    document.body.dataset.forestGrass=String(grass.count);
    document.body.dataset.forestFlowers=String(flowers.count);
    document.body.dataset.forestShadows=mapShadows?'pcf':'contact';
  }
  return{contact,update,mapShadows};
}
