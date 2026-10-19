// Existing state, combat, collisions, multiplayer and save data are authoritative.
// This module renders actual WebGL 3D geometry only. It never paints 2D gameplay.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const SCALE=42;
const view=document.getElementById('forest3d');
const input=document.getElementById('game');
const status=document.getElementById('forest3dStatus');
function errorMessage(message) {
  document.body.dataset.spatialDimension='3d-error';
  if(status){status.textContent='3D 실행 오류: '+message;status.dataset.error='true';}
  console.error('[마력숲 3D]',message);
}
if(!view||!input||!status) {
  errorMessage('3D 렌더러용 화면이 없어.');
} else {
try {
  if(!window.WebGL2RenderingContext)throw Error('WebGL2를 지원하는 브라우저가 필요해.');
  const renderer=new THREE.WebGLRenderer({canvas:view,antialias:true,powerPreference:'high-performance'});
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.4;
  renderer.shadowMap.enabled=false;
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,matchMedia('(pointer:coarse)').matches?1.2:1.6));
  renderer.setSize(innerWidth,innerHeight,false);
  const scene=new THREE.Scene();
  scene.background=new THREE.Color('#9bbca7');
  scene.fog=new THREE.FogExp2('#9bbca7',.014);
  const camera=new THREE.PerspectiveCamera(54,innerWidth/innerHeight,.15,220);
  camera.position.set(0,25,30);
  camera.lookAt(0,0,-11);
  const hemisphere=new THREE.HemisphereLight(0xdaf3ff,0x47683b,2.0);
  scene.add(hemisphere);
  const sun=new THREE.DirectionalLight(0xffe8c1,2.45);
  sun.position.set(-36,63,-38);
  scene.add(sun);
  const groundPlane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
  const ray=new THREE.Raycaster(),mouse=new THREE.Vector2(),hit=new THREE.Vector3();
  const boxCache=new Map();
  function mat(hex,metalness=0) {return new THREE.MeshStandardMaterial({color:hex,roughness:.79,metalness});}
  const wood=mat('#6b472b'),leaf=mat('#327a44'),stone=mat('#909ca0'),metal=mat('#687b87',.55),roof=mat('#bf935f');
  const skin=mat('#e3b792'),shirt=mat('#4c78a5'),pants=mat('#39495c'),boots=mat('#4d332d');
  const geoBox=new THREE.BoxGeometry(1,1,1);
  const geoSphere=new THREE.IcosahedronGeometry(1,1);
  const geoCone=new THREE.ConeGeometry(1,1,6);
  const geoCylinder=new THREE.CylinderGeometry(1,1,1,8);
  const geoRock=new THREE.DodecahedronGeometry(1,0);
  function block(parent,geometry,material,x,y,z,sx=1,sy=1,sz=1) {
    const m=new THREE.Mesh(geometry,material);
    m.position.set(x,y,z);m.scale.set(sx,sy,sz);parent.add(m);return m;
  }
  function humanoid(color=shirt) {
    const body=new THREE.Group();
    block(body,geoBox,boots,-.24,.23,0,.29,.5,.35);
    block(body,geoBox,boots,.24,.23,0,.29,.5,.35);
    block(body,geoBox,pants,0,.86,0,.9,.85,.57);
    block(body,geoBox,color,0,1.75,0,1.04,1.19,.68);
    block(body,geoSphere,skin,0,2.65,0,.55,.58,.48);
    const left=block(body,geoBox,color,-.72,1.72,0,.32,1.08,.38);
    const right=block(body,geoBox,color,.72,1.72,0,.32,1.08,.38);
    return {group:body,left,right};
  }
  function beast(hex='#5c6c54') {
    const root=new THREE.Group(),coat=mat(hex);
    block(root,geoSphere,coat,0,.86,0,.67,.60,1.13);
    block(root,geoSphere,coat,0,1.03,-.95,.56,.52,.60);
    for(const [x,z] of [[-.43,-.64],[.43,-.64],[-.43,.68],[.43,.68]])
      block(root,geoCylinder,coat,x,.35,z,.17,.68,.18);
    block(root,geoCone,coat,-.34,1.55,-1,.20,.52,.20).rotation.x=Math.PI;
    block(root,geoCone,coat,.34,1.55,-1,.20,.52,.20).rotation.x=Math.PI;
    return root;
  }
  const player=new THREE.Group();
  const playerFallback=humanoid();
  player.add(playerFallback.group);
  scene.add(player);
  let playerLoaded=false,wolfTemplate=null,travelerTemplate=null;
  let playerAngle=0;
  // Source-backed shared native GLBs, not a library reference or an asset-count claim.
  const loader=new GLTFLoader();
  function nativeModel(url,kind) {
    loader.load(new URL(url,import.meta.url).href,gltf=>{
      const object=gltf.scene;
      if(!object)return;
      const bounds=new THREE.Box3().setFromObject(object);
      const size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
      const height=Math.max(size.y,.0001),normalizer=new THREE.Group();
      object.position.set(-center.x,-bounds.min.y,-center.z);
      object.scale.setScalar((kind==='human'?2.85:1.65)/height);
      // Normalize after parent scale so arbitrary source formats are visible at runtime.
      object.position.multiplyScalar((kind==='human'?2.85:1.65)/height);
      normalizer.add(object);
      if(kind==='human'){
        travelerTemplate=normalizer;
        const clone=normalizer.clone(true);
        player.add(clone);
        playerFallback.group.visible=false;
        playerLoaded=true;
      }else wolfTemplate=normalizer;
      document.body.dataset['native'+(kind==='human'?'Player':'Wolf')+'Model']='loaded';
    },undefined,err=>{
      document.body.dataset['native'+(kind==='human'?'Player':'Wolf')+'Model']='load-failed';
      console.warn('[마력숲 3D] GLB 로드 실패: 기본 3D 지오메트리를 사용',err);
    });
  }
  nativeModel('../../assets/shared/humanoid-traveler.glb','human');
  nativeModel('../../assets/shared/creature-wolf.glb','wolf');
  const terrainSize=9,side=25,half=(side-1)/2,terrainCount=side*side;
  const terrain=new THREE.InstancedMesh(new THREE.BoxGeometry(terrainSize,.24,terrainSize),
    new THREE.MeshStandardMaterial({vertexColors:false,roughness:1}),terrainCount);
  terrain.frustumCulled=false;scene.add(terrain);
  const biomeColors={
    forest:'#447e45',canyon:'#997458',volcano:'#6b5049',worldtree:'#48734b',
    crystal:'#4b8889',giantlake:'#457b8a',jungle:'#246f3e',snow:'#c1d6da',
    flowerfield:'#87a05a',giantgarden:'#769c57',swamp:'#506d49',desert:'#cfad71'
  };
  const terrainDummy=new THREE.Object3D(),tileColor=new THREE.Color();
  let tileOriginX=NaN,tileOriginY=NaN,lastTerrainAt=-Infinity,terrainReady=false;
  function rebuildTerrain(position,regionAt,now) {
    const ox=Math.floor(position.x/(terrainSize*SCALE))*terrainSize*SCALE;
    const oy=Math.floor(position.y/(terrainSize*SCALE))*terrainSize*SCALE;
    if(ox===tileOriginX&&oy===tileOriginY&&now-lastTerrainAt<4000)return;
    tileOriginX=ox;tileOriginY=oy;lastTerrainAt=now;
    let n=0;
    for(let y=-half;y<=half;y++)for(let x=-half;x<=half;x++){
      const wx=ox+x*terrainSize*SCALE,wy=oy+y*terrainSize*SCALE;
      terrainDummy.position.set((wx-position.x)/SCALE,-.17,(wy-position.y)/SCALE);
      terrainDummy.rotation.set(0,0,0);terrainDummy.scale.set(1,1,1);terrainDummy.updateMatrix();
      terrain.setMatrixAt(n,terrainDummy.matrix);
      const color=biomeColors[regionAt(wx,wy)]||biomeColors.forest;
      tileColor.set(color);
      // Small deterministic tonal difference adds depth without changing biome rules.
      tileColor.multiplyScalar(.93+((Math.abs(x*13+y*19)%7)/65));
      terrain.setColorAt(n,tileColor);n++;
    }
    terrain.instanceMatrix.needsUpdate=true;
    if(terrain.instanceColor)terrain.instanceColor.needsUpdate=true;
    terrainReady=true;
  }
  // Instancing keeps thousands of authored resource nodes from generating thousands of draw calls.
  const nature=new Map(),dummy=new THREE.Object3D();
  function instanced(key,geo,material,cap) {
    const mesh=new THREE.InstancedMesh(geo,material,cap);
    mesh.count=0;mesh.frustumCulled=false;scene.add(mesh);nature.set(key,{mesh,cap,n:0});
  }
  instanced('trunk',new THREE.CylinderGeometry(.20,.34,2.8,6),wood,260);
  instanced('canopy',new THREE.ConeGeometry(1.35,3.3,7),leaf,260);
  instanced('swamp',new THREE.ConeGeometry(1.6,4,7),mat('#345a41'),80);
  instanced('flower',new THREE.IcosahedronGeometry(1,0),mat('#d889cf'),70);
  instanced('rock',geoRock,stone,220);
  instanced('fiber',new THREE.ConeGeometry(.5,1,5),mat('#a7ba69'),170);
  instanced('ore',geoRock,metal,120);
  instanced('gold',geoRock,mat('#d6b04c',.35),90);
  instanced('crystal',new THREE.OctahedronGeometry(1,0),mat('#8ce0db',.3),120);
  instanced('carrot',geoCone,mat('#df933f'),100);
  instanced('poison',geoRock,mat('#668548'),60);
  const kinds=[
    ['trees','tree'],['swampTrees','swamptree'],['flowerGiantFlowers','giantflower'],
    ['rocks','rock'],['fibers','fiber'],['irons','iron'],['golds','gold'],
    ['essences','essence'],['crystals','crystal'],['carrots','carrot'],
    ['poisonStones','poisonstone'],['sunstones','sunstone']
  ];
  function addInstance(key,x,y,h,sx,sy,sz,angle,position){
    const r=nature.get(key);
    if(!r||r.n>=r.cap)return;
    dummy.position.set((x-position.x)/SCALE,h,(y-position.y)/SCALE);
    dummy.rotation.set(0,angle,0);dummy.scale.set(sx,sy,sz);dummy.updateMatrix();
    r.mesh.setMatrixAt(r.n++,dummy.matrix);
  }
  let lastNatureAt=-Infinity, lastNatureX=NaN,lastNatureY=NaN;
  function rebuildNature(state,now){
    const p=state.player;
    if(now-lastNatureAt<450&&Math.hypot(p.x-lastNatureX,p.y-lastNatureY)<170)return;
    lastNatureAt=now;lastNatureX=p.x;lastNatureY=p.y;
    for(const o of nature.values())o.n=0;
    for(const [list,kind] of kinds)for(const n of state[list]||[]) {
      if(n.dead||!Number.isFinite(n.x)||Math.abs(n.x-p.x)>4600||Math.abs(n.y-p.y)>4600)continue;
      const a=((n.x*.001+n.y*.00017)%6.283),h=Math.sin(a)*.15;
      if(kind==='tree'){addInstance('trunk',n.x,n.y,1.4,.95,1,.95,a,p);addInstance('canopy',n.x,n.y,3.85,1,1,1,a,p);}
      else if(kind==='swamptree')addInstance('swamp',n.x,n.y,2.3,1.25,1.3,1.25,a,p);
      else if(kind==='giantflower')addInstance('flower',n.x,n.y,1.3,1.0,1.1,1.0,a,p);
      else if(kind==='rock')addInstance('rock',n.x,n.y,.42,.75,.55,.7,a,p);
      else if(kind==='fiber')addInstance('fiber',n.x,n.y,.55,.9,1,.9,a,p);
      else if(kind==='iron')addInstance('ore',n.x,n.y,.52,.9,.75,.9,a,p);
      else if(kind==='gold')addInstance('gold',n.x,n.y,.45,.95,.75,.90,a,p);
      else if(kind==='carrot')addInstance('carrot',n.x,n.y,.32,.7,.75,.7,a,p);
      else if(kind==='poisonstone')addInstance('poison',n.x,n.y,.55,1.15,1.1,1.15,a,p);
      else addInstance('crystal',n.x,n.y,.74,1.05,1.55,1.05,a,p);
    }
    for(const {mesh,n} of nature.values()){mesh.count=n;mesh.instanceMatrix.needsUpdate=true;}
  }
  const actors=new Map(),structures=new Map(),effects=new Map();
  function actor(key,kind,color) {
    if(actors.has(key))return actors.get(key);
    const group=new THREE.Group();
    const animal=kind==='animal';
    const visual=animal?beast(color):humanoid(mat(color));
    group.add(animal?visual:visual.group);
    group.userData.limbs=animal?null:visual;
    scene.add(group);actors.set(key,group);return group;
  }
  function updateActor(key,x,y,direction,color,kind,position,now,range=3600){
    if(!Number.isFinite(x)||!Number.isFinite(y)||Math.abs(x-position.x)>range||Math.abs(y-position.y)>range)return;
    const a=actor(key,kind,color);
    a.visible=true;
    a.position.set((x-position.x)/SCALE,0,(y-position.y)/SCALE);
    a.rotation.y=direction;
    a.userData.seen=true;
    if(a.userData.limbs){
      const v=a.userData.limbs;
      v.left.rotation.x=Math.sin(now*.005+key.length)*.25;
      v.right.rotation.x=-v.left.rotation.x;
    }
  }
  const buildingDefinitions=[
    ['bench','bench'],['furnace','furnace'],['toxicFurnace','furnace'],
    ['ironBench','bench'],['goldBench','bench'],['jungleBench','bench'],
    ['sunstoneBench','bench'],['blacksmithAnvil','anvil'],
    ['cookingStation','furnace'],['incubator','incubator']
  ];
  function structure(key,kind) {
    if(structures.has(key))return structures.get(key);
    const root=new THREE.Group();
    if(kind==='wall'||kind==='door'){
      block(root,geoBox,kind==='door'?wood:stone,0,1.2,0,2.3,2.5,.55);
      if(kind==='door')block(root,geoSphere,metal,.77,1.15,.35,.1,.1,.1);
    }else if(kind==='treehouse'||kind==='tower'){
      block(root,geoCylinder,wood,0,1.75,0,2.4,3.5,2.4);
      block(root,geoCone,roof,0,4.0,0,2.65,2.4,2.65);
    }else if(kind==='bench'||kind==='anvil'){
      block(root,geoBox,wood,0,.95,0,1.9,.28,1.2);
      for(const x of [-.75,.75])for(const z of [-.42,.42])block(root,geoBox,wood,x,.44,z,.22,.88,.22);
      if(kind==='anvil')block(root,geoBox,metal,0,1.23,0,1.18,.25,.65);
    }else if(kind==='furnace'||kind==='incubator'){
      block(root,geoCylinder,kind==='incubator'?metal:stone,0,1,0,1.15,2.0,1.15);
      block(root,geoSphere,mat('#c98439'),0,1.7,0,.48,.28,.48);
    }else{
      block(root,geoBox,kind==='chest'?wood:stone,0,.57,0,1.5,1.1,1.2);
      block(root,geoBox,roof,0,1.12,0,1.62,.21,1.32);
    }
    scene.add(root);structures.set(key,root);return root;
  }
  function placeStructure(key,kind,x,y,position,turn=0) {
    if(!Number.isFinite(x)||!Number.isFinite(y)||Math.abs(x-position.x)>4000||Math.abs(y-position.y)>4000)return;
    const obj=structure(key,kind);
    obj.visible=true;obj.position.set((x-position.x)/SCALE,0,(y-position.y)/SCALE);
    obj.rotation.y=turn;obj.userData.seen=true;
  }
  function updateStructures(state,position) {
    for(const o of structures.values())o.userData.seen=false;
    for(const [prop,kind] of buildingDefinitions)if(state[prop])
      placeStructure(prop,kind,state[prop].x,state[prop].y,position);
    for(const [name,kind] of [['flags','flag'],['chests','chest'],['walls','wall'],
      ['doors','door'],['towers','tower'],['beds','bed'],['gardens','garden'],
      ['portals','portal']]){
      const list=state[name]||[];
      for(let i=0;i<list.length;i++){
        const b=list[i];
        if(!b||b.destroyed)continue;
        placeStructure(name+':'+(b.id??i),kind,b.x,b.y,position,
          b.vertical?Math.PI/2:(Number(b.rotation)||0));
      }
    }
    for(const [key,obj] of structures)if(!obj.userData.seen){scene.remove(obj);structures.delete(key);}
  }
  const fxGeometry=new THREE.OctahedronGeometry(.26,0);
  function updateProjectiles(state,position){
    for(const fx of effects.values())fx.userData.seen=false;
    for(let i=0;i<Math.min((state.projectiles||[]).length,100);i++){
      const p=state.projectiles[i];
      if(!p||!Number.isFinite(p.x)||Math.abs(p.x-position.x)>3500||Math.abs(p.y-position.y)>3500)continue;
      const key=p.id||'projectile'+i;
      let mesh=effects.get(key);
      if(!mesh){mesh=new THREE.Mesh(fxGeometry,mat('#ffd269'));scene.add(mesh);effects.set(key,mesh);}
      mesh.position.set((p.x-position.x)/SCALE,1.3,(p.y-position.y)/SCALE);
      mesh.userData.seen=true;
    }
    for(const [key,obj] of effects)if(!obj.userData.seen){scene.remove(obj);effects.delete(key);}
  }
  const world={x:9000,y:6000};
  let isReady=false,hasFrame=false,frames=0,lastTime=0;
  function pick(e){
    if(!hasFrame)return null;
    const rect=input.getBoundingClientRect();
    const x=(e.clientX-rect.left)/rect.width,y=(e.clientY-rect.top)/rect.height;
    mouse.set(x*2-1,1-y*2);
    ray.setFromCamera(mouse,camera);
    if(!ray.ray.intersectPlane(groundPlane,hit))return null;
    return {x:world.x+hit.x*SCALE,y:world.y+hit.z*SCALE};
  }
  function resize(){
    renderer.setSize(innerWidth,innerHeight,false);
    camera.aspect=innerWidth/innerHeight;
    camera.updateProjectionMatrix();
  }
  function render({state,multiplayer,regionAt,now}){
    if(!state?.player||state.area!=='surface'){
      // Surface is 3D-only; interior areas are represented by a 3D interior set, not a 2D fallback.
      if(!state?.player)return;
    }
    if(innerWidth!==view.clientWidth||innerHeight!==view.clientHeight)resize();
    const p=state.player;
    world.x=p.x;world.y=p.y;
    for(const a of actors.values())a.userData.seen=false;
    updateActor('local',p.x,p.y,Math.atan2(p.faceX||0,p.faceY||1),'#5175a7','human',p,now);
    // The player's saved equipment and movement state remain owned by the existing game.
    player.position.set(0,0,0);
    const angle=Math.atan2(p.faceX||0,p.faceY||1);
    playerAngle+=(angle-playerAngle)*.17;
    player.rotation.y=playerAngle;
    playerFallback.left.rotation.x=Math.sin(now*.007)*.20;
    playerFallback.right.rotation.x=-playerFallback.left.rotation.x;
    // Remove proxy once the dedicated player model is present.
    const localProxy=actors.get('local');if(localProxy)localProxy.visible=false;
    const surface=state.area==='surface';
    for(let i=0;i<(state.enemies||[]).length;i++){
      const e=state.enemies[i];
      if(!e||e.hp<=0||e.area!==state.area)continue;
      const t=e.type||{},wolf=/wolf|fox|boar|bear|croc|deer|tiger|snake|shark/.test(t.id||'');
      updateActor('enemy:'+String(e.netId||i),e.x,e.y,
        Math.atan2(e.faceX||0,e.faceY||1),t.color||'#7f9278',wolf?'animal':'humanoid',p,now);
      const a=actors.get('enemy:'+String(e.netId||i));
      if(a&&a.userData.seen) a.scale.setScalar(Math.min(3.3,Math.max(.7,(Number(t.r)||20)/19)));
    }
    for(const [id,r] of multiplayer?.remote||[]){
      if(!r||r.area!==state.area||now-(r.seenAt||0)>5000)continue;
      updateActor('peer:'+id,r.x,r.y,0,'#8bb6ed','humanoid',p,now);
    }
    if(state.pet?.hatched&&state.pet.alive)
      updateActor('pet',state.pet.x,state.pet.y,0,
        state.pet.form==='croc'?'#596d42':'#6a647d','animal',p,now);
    for(const [key,a] of actors)if(!a.userData.seen){scene.remove(a);actors.delete(key);}
    player.visible=true;
    updateStructures(state,p);
    updateProjectiles(state,p);
    if(surface){
      rebuildTerrain(p,regionAt,now);
      rebuildNature(state,now);
    }else{
      // Dedicated 3D interior material, not the legacy Canvas2D map.
      if(!terrainReady)rebuildTerrain(p,()=>state.area,now);
      terrain.setColorAt(0,new THREE.Color('#465257')); // floors stay solid 3D geometry
      if(terrain.instanceColor)terrain.instanceColor.needsUpdate=true;
      for(const o of nature.values())o.mesh.count=0;
    }
    if(!surface&&state.area!==lastArea){
      for(let i=0;i<terrain.count;i++)terrain.setColorAt(i,new THREE.Color('#4a5750'));
      if(terrain.instanceColor)terrain.instanceColor.needsUpdate=true;
    }
    if(surface&&lastArea!=='surface'){tileOriginX=NaN;lastTerrainAt=-Infinity;}
    lastArea=state.area;
    const biome=surface?regionAt(p.x,p.y):'underground';
    const sky=biome==='snow'?'#b7cddd':biome==='desert'?'#c8b286':biome==='volcano'?'#91766c':
      biome==='crystal'?'#85b4bc':biome==='swamp'?'#719488':'#9cb7a4';
    scene.background.set(sky);scene.fog.color.set(sky);
    scene.fog.density=state.weather?.kind==='FOG'?.022:.013;
    const aiming=p.torchEquipped?2:1.4;
    sun.intensity=state.weather?.kind==='STORM'?1.25:2.45;
    renderer.render(scene,camera);
    frames++;
    if(!hasFrame&&terrainReady){
      hasFrame=true;isReady=true;document.body.dataset.spatialDimension='3d';
      document.body.dataset.renderer='three-webgl';
      document.body.dataset.threeFrame='1';
      view.dataset.webglRendered='true';status.hidden=true;
    }
    if(frames%90===0)document.body.dataset.threeFrame=String(frames);
    lastTime=now;
  }
  let lastArea='surface';
  const bridge={pick,resize,render,get ready(){return isReady},get frameCount(){return frames}};
  // Initialize one 3D frame without starting gameplay, so loading can finish on title screen.
  window.__magicForest3d=bridge;
  view.addEventListener('webglcontextlost',e=>{e.preventDefault();isReady=false;hasFrame=false;errorMessage('GPU 연결이 끊어졌어. 새로고침해 줘.');});
  window.addEventListener('resize',resize);
  const selfTest=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),mat('#48764c'));
  selfTest.position.set(0,.5,0);scene.add(selfTest);
  renderer.render(scene,camera);
  scene.remove(selfTest);
  document.body.dataset.spatialDimension='3d-initialized';
  status.textContent='3D 환경 준비 완료 · 모드를 선택해';
  status.hidden=true;
  isReady=true;
  hasFrame=true;
  document.body.dataset.spatialDimension='3d';
  document.body.dataset.renderer='three-webgl';
  view.dataset.webglRendered='true';
} catch(err){errorMessage(err?.message||String(err));}
}