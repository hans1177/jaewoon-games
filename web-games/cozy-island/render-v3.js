// 파일명: web-games/cozy-island/render-v3.js
// 임포트: 기존 Three.js와 CC0 원본 아트 라이브러리.
import * as THREE from '../../assets/roblox/world-ghosts/native/mesh/three/three.module.js';
import {OBJLoader} from '../../assets/roblox/world-ghosts/native/mesh/three/examples/jsm/loaders/OBJLoader.js';
import {GLTFLoader} from '../../assets/roblox/world-ghosts/native/mesh/three/examples/jsm/loaders/GLTFLoader.js';
import {FBXLoader} from '../../assets/roblox/world-ghosts/native/mesh/three/examples/jsm/loaders/FBXLoader.js';
import {clone as cloneRig} from '../../assets/roblox/world-ghosts/native/mesh/three/examples/jsm/utils/SkeletonUtils.js';
const SC=1/36;
const MODELS=Object.freeze({
 tree:'homely-house/tree.obj',tree_large:'homely-house/tree_large.obj',
 stone:'homely-house/cobblestones.obj',flower:'homely-house/foliage_A.obj',
 crop:'homely-house/foliage_B.obj',house:'homely-house/house.obj',
 bench:'homely-house/bench_A.obj',fence:'homely-house/fence_straight.obj',
 gate:'homely-house/gate_single.obj',package:'homely-house/package.obj',
 hero:'actor:knight.glb',npc:'actor:rogue.glb',soldier:'actor:barbarian.glb',
 enemy:'actor:skeleton-warrior.glb',wolf:'forest:wolf.fbx',boar:'forest:hog.glb',
 snake:'forest:monster-26.obj',spider:'forest:monster-53.obj',bat:'forest:bat.fbx',
 golem:'forest:monster-41.obj',wizard:'actor:mage.glb'
});
// 그래픽: 성채의 석재·목재·지붕 색을 공유해 모바일 GPU 자원 사용을 제한한다.
const FORT_MATS=Object.freeze({
 stone:new THREE.MeshLambertMaterial({color:0xb5b1a1}),
 shade:new THREE.MeshLambertMaterial({color:0x8c958b}),
 wood:new THREE.MeshLambertMaterial({color:0x936c4d}),
 roof:new THREE.MeshLambertMaterial({color:0x8d5850}),
 field:new THREE.MeshLambertMaterial({color:0x886f49}),
 straw:new THREE.MeshLambertMaterial({color:0xd9b980}),
 flag:new THREE.MeshLambertMaterial({color:0x489d93}),
});
export class IslandRendererV3 {
  constructor(canvas) {
    this.canvas = canvas;
    // 기존 2D 캔버스는 확장 모듈의 좌표·입력 처리 전용으로만 유지한다.
    // 실제 월드는 WebGL 3D만 표시하며 2D로 되돌아가지 않는다.
    this.ctx = canvas.getContext('2d', { alpha: true });
    this.models3d=new Map();this.instances3d=new Map();this.native3d=false;
    this.init3d();this.resize();
  }
  // 3D 메인: 원본 섬·야생지대·정글 좌표와 저장/전투 책임을 유지한다.
  init3d(){
    let layer;
    try{
      layer=document.createElement('canvas');layer.id='island3d';
      this.canvas.parentNode.insertBefore(layer,this.canvas);
      this.gl=new THREE.WebGLRenderer({canvas:layer,antialias:false,powerPreference:'high-performance'});
      this.gl.outputColorSpace=THREE.SRGBColorSpace;
      this.scene3=new THREE.Scene();this.scene3.background=new THREE.Color(0x86cce0);
      this.camera3=new THREE.OrthographicCamera(-10,10,10,-10,.1,180);
      this.scene3.add(new THREE.HemisphereLight(0xfff7e2,0x366c7d,2.15));
      const sun=new THREE.DirectionalLight(0xfff0d8,2.0);sun.position.set(-18,56,32);
      this.scene3.add(sun);
      const ground=(w,d,x,y,color,elevation)=>{
        const mesh=new THREE.Mesh(new THREE.BoxGeometry(w*SC,.45,d*SC),
          new THREE.MeshLambertMaterial({color}));
        mesh.position.set(x*SC,elevation,y*SC);this.scene3.add(mesh);return mesh;
      };
      ground(3800,2500,1700,1030,0x60bfd3,-1.35);
      ground(1280,1030,730,595,0xf4dfac,-.7);
      ground(1170,920,730,595,0x97cc8b,-.4);
      this.east3=ground(1490,950,2100,595,0xebd09c,-.68);
      this.eastGrass3=ground(1380,850,2100,595,0x82be7c,-.39);
      this.jungle3=ground(1460,1020,2120,1550,0xeacf8c,-.7);
      this.jungleGrass3=ground(1360,880,2120,1560,0x589267,-.39);
      // 북쪽·서쪽·화산·심연동굴·정글 서쪽은 기존 좌표와 해금 조건 그대로 사용한다.
      this.north3=ground(1380,965,2115,-350,0xf3f0e2,-.7);
      this.northGrass3=ground(1300,860,2115,-350,0xa6c4aa,-.4);
      this.west3=ground(3015,890,-1342,595,0xe2cc9e,-.7);
      this.westGrass3=ground(2920,790,-1342,595,0x8baf78,-.4);
      this.volcano3=ground(1560,1040,3540,-300,0x846964,-.57);
      this.cave3=ground(3100,1040,6100,-300,0x414958,-.6);
      this.jungleWest3=ground(1185,830,892,1610,0x528e5d,-.39);
      const lake=new THREE.Mesh(new THREE.CircleGeometry(1,48),
        new THREE.MeshStandardMaterial({color:0x55b8d0,roughness:.5}));
      lake.rotation.x=-Math.PI/2;lake.scale.set(150*SC,112*SC,1);
      lake.position.set(390*SC,.035,370*SC);this.scene3.add(lake);
      this.native3d=true;this.load3dModels();
    }catch(error){
      console.error('포근섬 3D 초기화 실패',error);
      layer?.remove();this.native3d=false;
      const status=document.querySelector('#webglStatus');
      if(status){status.textContent='3D 화면을 시작할 수 없어. 이 브라우저의 WebGL 지원을 확인해 줘.';status.hidden=false}
    }
  }
  // 유틸: 첫 프레임 이후 원본 라이브러리를 차례로 적재한다.
  async load3dModels(){
    await new Promise(resolve=>requestAnimationFrame(resolve));
    for(const [kind,path] of Object.entries(MODELS)){
      if(!this.native3d)return;
      try{
        let model;
        if(path.startsWith('actor:')){
          const url=new URL('../../assets/roblox/actors/native/'+path.slice(6),import.meta.url);
          model=(await new GLTFLoader().loadAsync(url.href)).scene;
        }else if(path.startsWith('forest:')){
          const url=new URL('../../assets/shared/forest/'+path.slice(7),import.meta.url);
          if(path.endsWith('.fbx'))model=await new FBXLoader().loadAsync(url.href);
          else if(path.endsWith('.obj')){
            model=await new OBJLoader().loadAsync(url.href);
            const palette={snake:0x6c9b69,spider:0x78666b,golem:0x9b9998};
            model.traverse(part=>{if(part.isMesh)part.material=new THREE.MeshStandardMaterial({
              color:palette[kind]||0x9c9b95,roughness:1})});
          }else model=(await new GLTFLoader().loadAsync(url.href)).scene;
        }else{
          const url=new URL('../../assets/shared/'+path,import.meta.url);
          model=await new OBJLoader().loadAsync(url.href);
          const palette={tree:0x619364,tree_large:0x4f8058,stone:0x9da5a0,
            flower:0xd6abbc,crop:0x83a969,house:0xe0b88b};
          model.traverse(part=>{if(part.isMesh)part.material=new THREE.MeshStandardMaterial({
            color:palette[kind]||0xb9a584,roughness:1})});
        }
        this.models3d.set(kind,model);
      }catch(error){console.warn('포근섬 CC0 원본 모델 로딩 실패: '+kind,error)}
      await new Promise(resolve=>setTimeout(resolve,0));
    }
  }
  // 메인: 기존 건설 상태를 실제 입체 성채 건물로 표시한다. 경제·전투 판정은 건드리지 않는다.
  makeFort3d(kind,height){
    const group=new THREE.Group();
    const block=(w,h,d,x,y,z,material)=>{
      const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),FORT_MATS[material]);
      mesh.position.set(x,y,z);group.add(mesh);
    };
    const roof=(w,d,y,material='roof')=>{
      const mesh=new THREE.Mesh(new THREE.ConeGeometry(Math.max(w,d)*.76,1.35,4),
        FORT_MATS[material]);
      mesh.position.set(0,y,0);mesh.rotation.y=Math.PI/4;group.add(mesh);
    };
    const crenels=(w,d,y)=>{
      for(let x=-w/2+.22;x<=w/2-.15;x+=.56){
        block(.3,.36,.35,x,y,-d/2,'stone');
        block(.3,.36,.35,x,y,d/2,'stone');
      }
      for(let z=-d/2+.42;z<d/2-.2;z+=.58){
        block(.35,.36,.3,-w/2,y,z,'stone');
        block(.35,.36,.3,w/2,y,z,'stone');
      }
    };
    if(kind==='keep'){
      block(4.4,.55,3.4,0,.28,0,'shade');
      block(3.4,2.95,2.65,0,1.9,0,'stone');
      block(1.45,1.4,1.2,0,4,0,'shade');
      crenels(3.5,2.8,3.5);
      for(const x of [-2,2])for(const z of [-1.5,1.5]){
        block(.95,3.8,.95,x,2,z,'shade');
        block(1.15,.4,1.15,x,4.15,z,'stone');
      }
      block(.8,1.6,.15,0,1,1.38,'wood');
      block(.11,1.1,.1,0,5,0,'wood');
      block(.65,.38,.08,.3,5.28,0,'flag');
    }else if(kind==='tower'){
      block(1.9,3.75,1.9,0,1.9,0,'shade');
      block(2.3,.4,2.3,0,3.94,0,'stone');
      crenels(2.1,2.1,4.28);
      block(.55,1.3,.12,0,1.05,1,'wood');
      block(.1,.95,.1,0,4.8,0,'wood');
      block(.56,.3,.07,.27,5.08,0,'flag');
    }else if(kind==='wall'){
      block(3.45,1.7,.55,0,.88,0,'shade');
      block(3.6,.28,.8,0,1.82,0,'stone');
      for(let x=-1.5;x<1.65;x+=.7)block(.4,.4,.85,x,2.13,0,'stone');
    }else if(kind==='gate'){
      block(.75,2.7,.95,-1.55,1.4,0,'shade');
      block(.75,2.7,.95,1.55,1.4,0,'shade');
      block(3.8,.78,1,0,2.85,0,'stone');
      for(let x=-1.55;x<=1.55;x+=.78)block(.42,.4,1.1,x,3.43,0,'stone');
      block(.18,1.95,.95,-.98,1.01,0,'wood');
      block(.18,1.95,.95,.98,1.01,0,'wood');
    }else if(kind==='palisade'){
      block(3.4,.28,.45,0,.66,0,'wood');
      for(let x=-1.6;x<=1.62;x+=.45){
        block(.31,1.72,.32,x,.92,0,'wood');
        const cap=new THREE.Mesh(new THREE.ConeGeometry(.24,.45,4),FORT_MATS.straw);
        cap.position.set(x,2,0);cap.rotation.y=Math.PI/4;group.add(cap);
      }
    }else if(kind==='store'){
      block(3.3,.35,2.8,0,.18,0,'stone');
      for(const [x,z] of [[-1,-.5],[.15,-.55],[.95,.5]]){
        block(.95,.85,.82,x,.65,z,'wood');
        block(.98,.08,.1,x,1.05,z,'straw');
      }
      block(.32,2.4,.32,-1.48,1.25,1.15,'wood');
      block(.32,2.4,.32,1.48,1.25,1.15,'wood');
    }else if(kind==='path'){
      block(3.3,.13,1.8,0,.035,0,'stone');
      for(const x of [-1.05,0,1.05])block(.08,.017,1.73,x,.11,0,'shade');
    }else{
      block(3.45,.35,3,0,.18,0,'shade');
      block(3,2.15,2.65,0,1.42,0,kind==='mine'?'stone':'wood');
      roof(3.6,3.2,3.08,kind==='mine'?'shade':'roof');
      block(.78,1.4,.16,0,.88,1.41,'shade');
      if(kind==='barracks'){
        block(.22,2.9,.22,-1.25,1.5,1.4,'stone');
        block(.22,2.9,.22,1.25,1.5,1.4,'stone');
        block(.15,1.1,.12,-.65,2.15,1.48,'flag');
      }else if(kind==='lumber'){
        for(let i=0;i<3;i++){
          const log=new THREE.Mesh(new THREE.CylinderGeometry(.24,.24,2.4,6),FORT_MATS.wood);
          log.rotation.z=Math.PI/2;log.position.set(.48+i*.16,.4,1.55+i*.32);group.add(log);
        }
      }else if(kind==='mine'){
        block(1.35,.82,.9,-1.1,.43,1.55,'stone');
      }
    }
    group.scale.setScalar(height/4);
    return group;
  }
  make3d(kind,height){
    if(kind.startsWith('fort:'))return this.makeFort3d(kind.slice(5),height);
    const group=new THREE.Group(),original=this.models3d.get(kind);
    if(original){
      const model=['hero','npc','soldier','enemy'].includes(kind)?cloneRig(original):original.clone(true);
      const box=new THREE.Box3().setFromObject(model);
      if(!box.isEmpty()){
        const size=Math.max(.01,box.max.y-box.min.y),factor=height/size;
        const center=box.getCenter(new THREE.Vector3());
        model.scale.setScalar(factor);
        model.position.set(-center.x*factor,-box.min.y*factor,-center.z*factor);
      }
      group.add(model);
    }else{
      // 에셋 다운로드 중에만 임시 형상을 표시. 다운로드 완료 즉시 원본 교체.
      const geo=kind==='tree'||kind==='tree_large'?new THREE.ConeGeometry(height*.35,height,8):
        kind==='stone'?new THREE.DodecahedronGeometry(height*.4,0):
        kind==='flower'||kind==='crop'?new THREE.IcosahedronGeometry(height*.4,0):
        new THREE.CapsuleGeometry(height*.23,height*.5,4,8);
      const part=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({
        color:kind==='tree'||kind==='tree_large'?0x60956c:
          kind==='stone'?0x929f9b:kind==='flower'?0xe8a7c0:0xd5b58d
      }));
      part.position.y=height*.5;group.add(part);
    }
    return group;
  }
  // 그래픽만 갱신하며 game.state/병력/자원/저장 값은 변경하지 않는다.
  draw3d(game){
    if(!this.native3d)return;
    try{
      const player=game.player,visibleIds=new Set();
      const nearby=(x,y)=>Math.abs(x-player.x)<this.width+160&&
        Math.abs(y-player.y)<this.height+170;
      const put=(id,kind,x,y,height=2,yaw=0)=>{
        if(!Number.isFinite(x)||!Number.isFinite(y)||!nearby(x,y))return;
        visibleIds.add(id);
        const loaded=this.models3d.has(kind);
        let item=this.instances3d.get(id);
        if(item&&(item.kind!==kind||item.loaded!==loaded)){
          this.scene3.remove(item.mesh);this.instances3d.delete(id);item=null;
        }
        if(!item){const mesh=this.make3d(kind,height);
          this.scene3.add(mesh);item={mesh,kind,loaded};this.instances3d.set(id,item)}
        item.mesh.position.set(x*SC,.03,y*SC);
        if(item.mesh.rotation.y!==yaw)item.mesh.rotation.y=yaw;
      };
      this.east3.visible=this.eastGrass3.visible=!!game.state.expanded;
      const jungle=!!game.state.southernJungle?.unlocked||game.world.h>1200;
      this.jungle3.visible=this.jungleGrass3.visible=jungle;
      const north=!!game.state.northernRegion?.unlocked;
      const west=!!game.state.cozyExpansionV4?.west?.unlocked;
      const volcano=!!game.state.villageExpansionV14?.townHallLv3&&north;
      const cave=!!game.state.abyssCaveV23?.inside||!!game.state.darknessFlameV19?.townHallLv4;
      this.north3.visible=this.northGrass3.visible=north;
      this.west3.visible=this.westGrass3.visible=west;
      this.volcano3.visible=volcano;
      this.cave3.visible=cave;
      this.jungleWest3.visible=!!game.state.jungleWestCamp?.unlocked;
      for(const n of game.nodes){
        if(n.lockedByExpansion&&!game.state.expanded||n.readyAt>game.timeNow)continue;
        const kind=n.kind==='tree'?'tree':n.kind==='rock'?'stone':'flower';
        put('resource:'+n.id,kind,n.x,n.y,kind==='tree'?3.2:1.1);
      }
      put('home','house',765,350,4.8);
      put('market','fort:store',game.workerShop.x,game.workerShop.y,3.0);
      const production=game.state.productionBuildings||{},village=game.state.villageDevelopment||{};
      put('lumber',production.lumberBuilt?'fort:lumber':'package',245,850,production.lumberBuilt?3.2:1.0);
      put('mine',production.mineBuilt?'fort:mine':'stone',785,965,production.mineBuilt?3.0:1.2);
      if(village.defenseTowerBuilt)put('defense-tower','fort:tower',400,1090,4.9);
      if(village.townHallBuilt){
        put('townhall','fort:keep',1010,1090,5.4);
        // 성벽은 기존 이동 판정 바깥 경계에만 두는 입체 장식이다.
        for(const [x,y] of [[735,1160],[865,1160],[1145,1160],[1275,1160]])
          put('castle-wall:'+x,'fort:wall',x,y,3);
        put('castle-gate','fort:gate',1005,1160,3.6);
        for(const [x,y] of [[1368,890],[1368,1015]])
          put('castle-east-wall:'+y,'fort:wall',x,y,3,Math.PI/2);
        put('castle-court-path','fort:path',1010,925,1.1);
      }
      if(game.state.seedDepot?.built)put('seed-depot','package',835,505,1.3);
      if(game.state.smithy)put('smithy','bench',790,1080,2.1);
      if(game.state.darknessFlameV19?.blackMineBuilt)put('black-mine','house',-880,690,3.6);
      if(game.state.abyssCaveV23?.researchLabBuilt)put('research-lab','house',-690,420,4);
      put('barracks',game.state.barracksBuilt?'fort:barracks':'package',
        game.barracks.x,game.barracks.y,3.5);
      if(game.state.barracksBuilt){
        put('garrison-palisade-left','fort:palisade',900,790,2.1);
        put('garrison-palisade-right','fort:palisade',1240,790,2.1);
      }
      put('ship','bench',775,760,1.4);put('fishing','bench',520,430,1.4);
      if(!game.state.expanded)put('east-gate','gate',1325,600,3.0);
      if(jungle)put('jungle-gate','gate',2170,1080,3.0);
      for(let i=0;i<game.state.plots.length;i++){
        const crop=game.state.plots[i];
        put('plot:'+i,crop.state==='growing'?'crop':'stone',
          959+(i%3)*78,404+Math.floor(i/3)*78,.55);
      }
      for(const npc of game.npcs)put('npc:'+npc.id,'npc',npc.x,npc.y,1.9);
      for(let i=0;i<game.state.workers;i++){
        const phase=game.timeNow/1000+i*1.7;
        put('worker:'+i,'npc',1020+Math.cos(phase)*50+i*12,505+Math.sin(phase)*25,1.8);
      }
      for(const unit of game.allies)if(unit.hp>0)put('ally:'+unit.id,
        unit.kind==='knight'?'hero':'soldier',unit.x,unit.y,1.9);
      for(const unit of game.enemies)if(unit.hp>0)put('enemy:'+unit.id,
        'enemy',unit.x,unit.y,unit.boss?2.5:1.9);
      if(game.state.expanded)for(const wolf of game.wolves)if(wolf.alive)
        put('wolf:'+wolf.id,'wolf',wolf.x,wolf.y,wolf.boss?2.8:1.6);
      if(jungle)for(const boar of game.boars||[])if(boar.alive)
        put('boar:'+boar.id,'boar',boar.x,boar.y,1.75);
      if(north)for(const animal of game.northernMobs||[])if(animal.alive)
        put('north:'+animal.id,animal.type==='wolf'?'wolf':'snake',animal.x,animal.y,1.7);
      if(volcano)for(const enemy of game.volcanoEnemies||[])if(enemy.alive)
        put('volcano:'+enemy.id,'enemy',enemy.x,enemy.y,enemy.boss?2.7:2);
      if(cave)for(const enemy of game.abyssEnemies||[])if(enemy.alive)
        put('abyss:'+enemy.id,enemy.kind==='caveSpider'?'spider':
          enemy.kind==='abyssBat'?'bat':enemy.kind==='abyssWizard'?'wizard':'golem',
          enemy.x,enemy.y,enemy.boss?3:2);
      if(game.state.jungleWestCamp?.unlocked)for(const enemy of game.jungleCampEnemies||[])
        if(enemy.alive)put('jungle-camp:'+enemy.id,'enemy',enemy.x,enemy.y,2);
      if(west&&game.westBoss?.alive)
        put('west-boss','enemy',game.westBoss.x,game.westBoss.y,3);
      if(west){
        put('west-gate','gate',145,600,3.2);
        put('west-chest','package',-1710,875,1.5);
      }
      if(north)put('north-gate','gate',2170,175,3.1);
      if(volcano){
        put('volcano-gate','gate',2800,-280,3);
        const blackIron=[[2940,-670],[3150,-320],[3370,-710],[3550,-180],[3740,-570],[3920,-260],[4100,-690],[4210,-390]];
        blackIron.forEach(([x,y],i)=>put('black-ore:'+i,'stone',x,y,1.6));
      }
      if(cave){
        put('cave-entry','gate',4260,-300,3.7);
        const crystals=[[4750,-610],[5100,-120],[5390,-590],[5710,-170],[6080,-620],[6650,-150],[7210,-620]];
        crystals.forEach(([x,y],i)=>put('abyss-crystal:'+i,'stone',x,y,1.5));
      }
      // 기존 라이브러리 울타리는 3D 환경 장식 전용이다. 충돌과 이동 제한을 바꾸지 않는다.
      for(let i=0;i<5;i++){
        put('fence:'+i,'fence',1150+i*38,185,1.1);
      }
      put('player','hero',player.x,player.y,1.9);
      for(const [id,item] of this.instances3d)if(!visibleIds.has(id)){
        this.scene3.remove(item.mesh);this.instances3d.delete(id);
      }
      this.camera3.position.set(player.x*SC,54,player.y*SC+10);
      this.camera3.lookAt(player.x*SC,0,player.y*SC);
      const hour=game.state.minutes/60;
      this.scene3.background.setHex(hour<6||hour>20?0x365372:0x86cce0);
      this.gl.render(this.scene3,this.camera3);
    }catch(error){
      console.error('포근섬 3D 렌더링 실패',error);
      this.native3d=false;if(this.gl?.domElement)this.gl.domElement.hidden=true;
      const status=document.querySelector('#webglStatus');
      if(status){status.textContent='3D 표시 오류가 발생했어. 화면을 새로고침해 줘.';status.hidden=false}
    }
  }
  resize() {
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.width = Math.max(1, window.innerWidth);
    this.height = Math.max(1, window.innerHeight);
    // 이전 확장 스크립트의 2D 캔버스 API만 유지하고 화면 버퍼는 최소 크기로 둔다.
    this.canvas.width = 1;
    this.canvas.height = 1;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.ctx.setTransform(this.dpr,0,0,this.dpr,0,0);
    if(this.native3d){
      this.gl.setPixelRatio(Math.min(1.3,window.devicePixelRatio||1));
      this.gl.setSize(this.width,this.height,false);
      this.camera3.left=-this.width*SC/2;this.camera3.right=this.width*SC/2;
      this.camera3.top=this.height*SC/2;this.camera3.bottom=-this.height*SC/2;
      this.camera3.updateProjectionMatrix();
    }
  }
  camera(game) { return { x: game.player.x - this.width/2, y: game.player.y - this.height/2 }; }
  screenToWorld(game, sx, sy) { const c=this.camera(game); return {x:sx+c.x,y:sy+c.y}; }
  draw(game) {
    if(this.native3d)this.draw3d(game);
    // 원본 확장 렌더 함수 연결은 유지하지만 2D 출력은 1픽셀 비표시 버퍼로만 보낸다.
    const ctx=this.ctx; ctx.setTransform(this.dpr,0,0,this.dpr,0,0); ctx.clearRect(0,0,this.width,this.height);
    const cam=this.camera(game); ctx.save(); ctx.translate(-cam.x,-cam.y);
    this.drawSea(ctx,game); this.drawIsland(ctx,game); this.drawObjects(ctx,game); this.drawUnits(ctx,game); this.drawPlayer(ctx,game.player); ctx.restore();
    this.drawLight(ctx,game); if(game.weather==='비') this.drawRain(ctx);
  }
  drawSea(ctx,g){if(this.native3d)return;ctx.fillStyle='#82cadd';ctx.fillRect(0,0,g.world.w,g.world.h);ctx.strokeStyle='rgba(255,255,255,.22)';for(let y=30;y<g.world.h;y+=55){ctx.beginPath();for(let x=0;x<g.world.w;x+=85){ctx.moveTo(x,y);ctx.quadraticCurveTo(x+20,y-6,x+40,y)}ctx.stroke()}}
  rr(ctx,x,y,w,h,r){ctx.beginPath();ctx.roundRect?ctx.roundRect(x,y,w,h,r):(ctx.rect(x,y,w,h));}
  drawIsland(ctx,g){if(this.native3d)return;
    const w=g.state.expanded?2810:1260; ctx.fillStyle='#f2dfa8';this.rr(ctx,100,90,w,1010,110);ctx.fill();ctx.fillStyle='#9fd18f';this.rr(ctx,145,135,w-90,920,90);ctx.fill();
    ctx.fillStyle='#e6d3a6';ctx.beginPath();ctx.ellipse(660,610,330,85,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#72bdd3';ctx.beginPath();ctx.ellipse(390,370,145,105,-.12,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#d6f2f7';ctx.lineWidth=7;ctx.stroke();
    if(g.state.expanded){ctx.fillStyle='rgba(72,112,69,.18)';ctx.fillRect(1390,155,1450,880);ctx.fillStyle='#315748';ctx.font='800 18px system-ui';ctx.fillText('동쪽 야생지대',1460,190)}
    else {ctx.fillStyle='#6e826e';ctx.fillRect(1360,470,16,250);ctx.fillStyle='#315748';ctx.font='700 16px system-ui';ctx.fillText('동쪽 지역 해금',1295,452);ctx.font='34px system-ui';ctx.fillText('🔐',1320,600)}
  }
  drawObjects(ctx,g){if(this.native3d)return;
    this.drawHouse(ctx,g);this.drawFarm(ctx,g);this.drawBarracks(ctx,g);this.drawWorkerShop(ctx,g);
    for(const n of g.nodes){if(n.lockedByExpansion&&!g.state.expanded)continue;if(n.kind==='tree')this.drawTree(ctx,n,g.timeNow);else if(n.kind==='rock')this.drawRock(ctx,n,g.timeNow);else this.drawFlower(ctx,n,g.timeNow)}
    for(const n of g.npcs){ctx.font='30px system-ui';ctx.fillText(n.icon,n.x-15,n.y+8);ctx.fillStyle='#315748';ctx.font='12px system-ui';ctx.fillText(n.name,n.x-10,n.y+30)}
    ctx.font='31px system-ui';ctx.fillText('🧺',760,760);ctx.font='12px system-ui';ctx.fillStyle='#315748';ctx.fillText('출하',752,785);ctx.font='31px system-ui';ctx.fillText('🎣',520,430);ctx.font='12px system-ui';ctx.fillText('낚시터',510,458);
    if(g.state.expanded) for(const w of g.wolves) this.drawWolf(ctx,w,g.selectedWolfId===w.id);
  }
  drawHouse(ctx,g){ctx.fillStyle='#f5d9a8';ctx.fillRect(660,250,210,145);ctx.fillStyle='#d98265';ctx.beginPath();ctx.moveTo(635,270);ctx.lineTo(765,175);ctx.lineTo(895,270);ctx.closePath();ctx.fill();ctx.fillStyle='#82583b';ctx.fillRect(746,325,42,70);ctx.fillStyle='#315748';ctx.font='700 13px system-ui';ctx.fillText(`우리 집 · 꾸미기 ${g.state.decor.length}/3`,700,235)}
  drawFarm(ctx,g){ctx.fillStyle='#b4875d';ctx.fillRect(910,350,260,190);g.state.plots.forEach((p,i)=>{const x=930+(i%3)*78,y=375+Math.floor(i/3)*78;ctx.fillStyle=p.watered?'#6b5549':'#815f46';ctx.fillRect(x,y,58,58);ctx.strokeStyle='#d3ad79';ctx.strokeRect(x,y,58,58);if(p.state==='growing'){ctx.font='24px system-ui';ctx.fillText(p.ready?'🥕':'🌱',x+16,y+37)}});ctx.fillStyle='#315748';ctx.font='700 13px system-ui';ctx.fillText('작은 텃밭',995,340)}
  drawBarracks(ctx,g){const{x,y}=g.barracks;if(!g.state.barracksBuilt){ctx.setLineDash([8,7]);ctx.strokeStyle='#6d725d';ctx.strokeRect(x-58,y-46,116,92);ctx.setLineDash([]);ctx.font='24px system-ui';ctx.fillText('🏗️',x-14,y+8);ctx.fillStyle='#315748';ctx.font='12px system-ui';ctx.fillText('병영 건설터',x-35,y+65);return}ctx.fillStyle='#8c6d49';ctx.fillRect(x-58,y-30,116,76);ctx.fillStyle='#646348';ctx.beginPath();ctx.moveTo(x-72,y-30);ctx.lineTo(x,y-82);ctx.lineTo(x+72,y-30);ctx.closePath();ctx.fill();ctx.fillStyle='#fff';ctx.font='700 13px system-ui';ctx.fillText('병영',x-14,y-92)}
  drawWorkerShop(ctx,g){const{x,y}=g.workerShop;ctx.fillStyle='#b78458';ctx.fillRect(x-55,y-35,110,72);ctx.fillStyle='#7e6042';ctx.beginPath();ctx.moveTo(x-68,y-35);ctx.lineTo(x,y-78);ctx.lineTo(x+68,y-35);ctx.closePath();ctx.fill();ctx.font='25px system-ui';ctx.fillText('🧑‍🌾',x-13,y+12);ctx.fillStyle='#315748';ctx.font='700 12px system-ui';ctx.fillText(`노비 판매소 ${g.state.workers}/3`,x-48,y-88)}
  drawUnits(ctx,g){if(this.native3d){
      for(const u of g.allies)this.drawUnit(ctx,u);
      for(const u of g.enemies)this.drawUnit(ctx,u);
      return;
    }for(const u of g.allies)this.drawUnit(ctx,u);for(const u of g.enemies)this.drawUnit(ctx,u);for(let i=0;i<g.state.workers;i++){const a=performance.now()/1000+i*2.1;ctx.font='25px system-ui';ctx.fillText('🧑‍🌾',1020+Math.cos(a)*50+i*12,505+Math.sin(a*.8)*35)}}
  drawUnit(ctx,u){if(u.hp<=0)return;
    if(this.native3d){const w=u.boss?58:42;ctx.fillStyle='#364239';
      ctx.fillRect(u.x-w/2,u.y-30,w,5);ctx.fillStyle=u.enemy?'#bf535d':'#4e9c65';
      ctx.fillRect(u.x-w/2,u.y-30,w*Math.max(0,u.hp/u.maxHp),5);return;}const icon=u.boss?'👹':u.kind==='archer'?'🏹':'⚔️';ctx.textAlign='center';ctx.font=u.boss?'42px system-ui':'29px system-ui';ctx.fillText(icon,u.x,u.y+10);const w=u.boss?58:42,p=Math.max(0,u.hp/u.maxHp);ctx.fillStyle='rgba(0,0,0,.35)';ctx.fillRect(u.x-w/2,u.y-30,w,5);ctx.fillStyle=u.enemy?'#c14f4f':'#4f9a5d';ctx.fillRect(u.x-w/2,u.y-30,w*p,5);ctx.textAlign='start'}
  drawWolf(ctx,w,selected){if(!w.alive)return;
    if(this.native3d){ctx.fillStyle='#374a41';ctx.fillRect(w.x-25,w.y-30,50,5);
      ctx.fillStyle=selected?'#f4a73c':'#bb525b';
      ctx.fillRect(w.x-25,w.y-30,50*Math.max(0,w.hp/w.maxHp),5);return;}ctx.textAlign='center';ctx.font='34px system-ui';ctx.fillText('🐺',w.x,w.y+10);ctx.fillStyle='rgba(0,0,0,.35)';ctx.fillRect(w.x-25,w.y-30,50,5);ctx.fillStyle=selected?'#f0a43b':'#b54d4d';ctx.fillRect(w.x-25,w.y-30,50*Math.max(0,w.hp/w.maxHp),5);if(selected){ctx.strokeStyle='#f0a43b';ctx.lineWidth=3;ctx.beginPath();ctx.arc(w.x,w.y,30,0,Math.PI*2);ctx.stroke()}ctx.textAlign='start'}
  drawTree(ctx,n,now){ctx.fillStyle=n.readyAt<=now?'#6f9f62':'#90aa87';ctx.beginPath();ctx.arc(n.x,n.y-22,34,0,Math.PI*2);ctx.fill();ctx.fillStyle='#795c3e';ctx.fillRect(n.x-6,n.y+4,12,34)}
  drawRock(ctx,n,now){ctx.globalAlpha=n.readyAt<=now?1:.38;ctx.font='28px system-ui';ctx.fillText('🪨',n.x-14,n.y+12);ctx.globalAlpha=1}
  drawFlower(ctx,n,now){ctx.globalAlpha=n.readyAt<=now?1:.32;ctx.font='25px system-ui';ctx.fillText(n.icon||'🌼',n.x-12,n.y+10);ctx.globalAlpha=1}
  drawPlayer(ctx,p){if(this.native3d)return;ctx.textAlign='center';ctx.font='36px system-ui';ctx.fillText('🧑',p.x,p.y+10);ctx.fillStyle='#315748';ctx.font='700 11px system-ui';ctx.fillText('나',p.x,p.y+32);ctx.textAlign='start'}
  drawLight(ctx,g){if(this.native3d)return;const h=g.state.minutes/60;let a=0;if(h<6)a=.36;else if(h<8)a=.18*(8-h)/2;else if(h>18)a=Math.min(.38,(h-18)*.07);if(a){ctx.fillStyle=`rgba(30,44,76,${a})`;ctx.fillRect(0,0,this.width,this.height)}}
  drawRain(ctx){if(this.native3d)return;ctx.strokeStyle='rgba(220,245,255,.55)';ctx.lineWidth=2;for(let i=0;i<45;i++){const x=(i*83+performance.now()*.18)%this.width,y=(i*47+performance.now()*.32)%this.height;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-7,y+17);ctx.stroke()}}
}
