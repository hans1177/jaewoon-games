// 파일명: web-games/cozy-island/render-v3.js
// 임포트: 기존 Three.js와 CC0 원본 아트 라이브러리.
import * as THREE from '../../assets/roblox/world-ghosts/native/mesh/three/three.module.js';
import {OBJLoader} from '../../assets/roblox/world-ghosts/native/mesh/three/examples/jsm/loaders/OBJLoader.js';
import {GLTFLoader} from '../../assets/roblox/world-ghosts/native/mesh/three/examples/jsm/loaders/GLTFLoader.js';
import {FBXLoader} from '../../assets/roblox/world-ghosts/native/mesh/three/examples/jsm/loaders/FBXLoader.js';
import {clone as cloneRig} from '../../assets/roblox/world-ghosts/native/mesh/three/examples/jsm/utils/SkeletonUtils.js';
const SC=1/36;
// 카메라: 45도 방위·30도 고도의 2:1 등각 투영. 게임 좌표는 그대로 유지한다.
const ISO_YAW=Math.PI/4,ISO_PITCH=Math.PI/6;
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
export class IslandRendererV3 {
  constructor(canvas) {
    this.canvas = canvas;
    // 기존 2D 캔버스는 확장 모듈의 좌표·입력 처리 전용으로만 유지한다.
    // 실제 월드는 WebGL 3D만 표시하며 2D로 되돌아가지 않는다.
    this.ctx = canvas.getContext('2d', { alpha: true });
    this.models3d=new Map();this.instances3d=new Map();this.native3d=false;
    this.viewFocus={x:1050,y:635};this.viewZoom=null;this.last3dPaint=0;
    this.pixelTextures=new Map();this.pixelScale=2;
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
      this.scene3=new THREE.Scene();this.scene3.background=new THREE.Color(0x6c9799);
      this.camera3=new THREE.OrthographicCamera(-10,10,10,-10,.1,700);
      this.scene3.add(new THREE.HemisphereLight(0xffefcf,0x454c36,1.7));
      const sun=new THREE.DirectionalLight(0xffecc9,1.7);sun.position.set(-35,65,24);
      this.scene3.add(sun);
      // 메인: 저폴리 성채는 기존 렌더 장면·재질을 공유하며 저장·게임 상태와 독립된다.
      this.fortGeometry={
        box:new THREE.BoxGeometry(1,1,1),
        roof:new THREE.ConeGeometry(1,1,4),
        tower:new THREE.CylinderGeometry(1,1,1,6)
      };
      const paint=(color,kind)=>new THREE.MeshLambertMaterial({color,flatShading:true,map:this.pixelTexture(kind)});
      this.fortMaterial={
        stone:paint(0xa99a7b,'stone'),stoneBright:paint(0xd0c3a2,'stone'),
        timber:paint(0x94734b,'wood'),darkWood:paint(0x503a29,'wood'),
        plaster:paint(0xd3c2a0,'plaster'),tile:paint(0x9a4832,'roof'),
        cloth:paint(0x727b50,'cloth'),banner:paint(0xa73f2c,'cloth'),
        road:paint(0xb19b71,'road')
      };
      const ground=(w,d,x,y,color,elevation)=>{
        const kind=elevation<=-1?'water':color===0x414958?'rock':
          color===0x846964?'rock':elevation<-.5?'sand':'grass';
        const map=this.pixelTexture(kind).clone();
        map.repeat.set(w/180,d/180);map.needsUpdate=true;
        const mesh=new THREE.Mesh(new THREE.BoxGeometry(w*SC,.45,d*SC),
          new THREE.MeshLambertMaterial({color,map}));
        mesh.position.set(x*SC,elevation,y*SC);this.scene3.add(mesh);return mesh;
      };
      ground(3800,2500,1700,1030,0x68979b,-1.35);
      ground(1280,1030,730,595,0xd4bc89,-.7);
      ground(1170,920,730,595,0x9ca168,-.4);
      this.east3=ground(1490,950,2100,595,0xebd09c,-.68);
      this.eastGrass3=ground(1380,850,2100,595,0x92965c,-.39);
      this.jungle3=ground(1460,1020,2120,1550,0xeacf8c,-.7);
      this.jungleGrass3=ground(1360,880,2120,1560,0x677c4d,-.39);
      // 북쪽·서쪽·화산·심연동굴·정글 서쪽은 기존 좌표와 해금 조건 그대로 사용한다.
      this.north3=ground(1380,965,2115,-350,0xf3f0e2,-.7);
      this.northGrass3=ground(1300,860,2115,-350,0xa6c4aa,-.4);
      this.west3=ground(3015,890,-1342,595,0xe2cc9e,-.7);
      this.westGrass3=ground(2920,790,-1342,595,0x8baf78,-.4);
      this.volcano3=ground(1560,1040,3540,-300,0x846964,-.57);
      this.cave3=ground(3100,1040,6100,-300,0x414958,-.6);
      this.jungleWest3=ground(1185,830,892,1610,0x528e5d,-.39);
      const lake=new THREE.Mesh(new THREE.CircleGeometry(1,48),
        new THREE.MeshLambertMaterial({color:0x689b9e,map:this.pixelTexture('water')}));
      lake.rotation.x=-Math.PI/2;lake.scale.set(150*SC,112*SC,1);
      lake.position.set(390*SC,.035,370*SC);this.scene3.add(lake);
      // 기존 연못 물 재질과 메시를 재사용해 성문 앞 해자 형상을 표현한다.
      this.moat3=lake.clone();this.moat3.scale.set(180*SC,330*SC,1);
      this.moat3.position.set(1460*SC,.055,615*SC);
      this.moat3.visible=false;this.scene3.add(this.moat3);
      this.native3d=true;this.load3dModels();
    }catch(error){
      console.error('포근섬 3D 초기화 실패',error);
      layer?.remove();this.native3d=false;
      const status=document.querySelector('#webglStatus');
      if(status){status.textContent='3D 화면을 시작할 수 없어. 이 브라우저의 WebGL 지원을 확인해 줘.';status.hidden=false}
    }
  }
  // 그래픽: 원본 게임 이미지를 복사하지 않고 작은 팔레트 질감을 한 번 생성한다.
  pixelTexture(kind='grass'){
    if(this.pixelTextures.has(kind))return this.pixelTextures.get(kind);
    const canvas=document.createElement('canvas');canvas.width=canvas.height=32;
    const ctx=canvas.getContext('2d');
    for(let y=0;y<32;y++)for(let x=0;x<32;x++){
      const noise=((x*374761393+y*668265263)^((x+7)*(y+13)*1274126177))>>>0;
      let value=[207,220,232,244][noise%4];
      if(kind==='stone'){
        const seam=y%8===0||(x+(Math.floor(y/8)%2)*8)%16===0;
        value=seam?147:y%8===1?250:216+(noise%4)*8;
      }else if(kind==='roof'){
        const seam=y%4===3||(x+(Math.floor(y/4)%2)*4)%8===0;
        value=seam?142:y%4===0?250:209+(noise%3)*11;
      }else if(kind==='wood')value=x%8===0?139:x%8===1?247:210+(noise%5)*8;
      else if(kind==='water')value=(y%9===0&&(x+Math.floor(y/9)*7)%17<7)?252:218+(noise%3)*9;
      else if(kind==='grass')value=noise%19===0?171:noise%11===0?249:220+(noise%3)*7;
      else if(kind==='sand'||kind==='road')value=noise%13===0?183:225+(noise%3)*9;
      else if(kind==='plaster')value=noise%17===0?196:234+(noise%3)*8;
      else if(kind==='cloth')value=(x+y)%4===0?208:244;
      ctx.fillStyle=`rgb(${value},${value},${value})`;ctx.fillRect(x,y,1,1);
    }
    const texture=new THREE.CanvasTexture(canvas);
    texture.magFilter=texture.minFilter=THREE.NearestFilter;
    texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
    texture.generateMipmaps=false;texture.colorSpace=THREE.SRGBColorSpace;
    this.pixelTextures.set(kind,texture);return texture;
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
          const palette={tree:0x7d8b4b,tree_large:0x5e723c,stone:0xaaa28d,
            flower:0xc5a77b,crop:0x8a9850,house:0xd2bb8a};
          model.traverse(part=>{if(part.isMesh)part.material=new THREE.MeshStandardMaterial({
            color:palette[kind]||0xb9a584,roughness:1,flatShading:true,
            map:this.pixelTexture(kind==='stone'?'rock':kind==='house'?'plaster':'grass')})});
        }
        model.traverse(part=>{
          if(!part.isMesh)return;
          for(const material of Array.isArray(part.material)?part.material:[part.material]){
            if(!material)continue;
            material.flatShading=true;
            if(material.map){material.map.magFilter=material.map.minFilter=THREE.NearestFilter;
              material.map.generateMipmaps=false;material.map.needsUpdate=true;}
            material.needsUpdate=true;
          }
        });
        this.models3d.set(kind,model);
      }catch(error){console.warn('포근섬 CC0 원본 모델 로딩 실패: '+kind,error)}
      await new Promise(resolve=>setTimeout(resolve,0));
    }
  }
  make3d(kind,height){
    const group=new THREE.Group();
    // 메인: 스트롱홀드식 저폴리 건축은 기존 Three.js 장면에서만 그린다.
    // 공용 기본 메쉬/재질을 재사용하고 경제·충돌·전투·저장 값에는 관여하지 않는다.
    if(kind.startsWith('fort-')){
      const {box,roof,tower}=this.fortGeometry;
      const m=this.fortMaterial;
      const part=(geometry,material,x,y,z,sx,sy,sz,rotation=0)=>{
        const mesh=new THREE.Mesh(geometry,material);
        mesh.position.set(x,y,z);
        mesh.scale.set(sx,sy,sz);
        mesh.rotation.y=rotation;
        group.add(mesh);
      };
      if(kind==='fort-road'){
        part(box,m.road,0,.015,0,2.1,.035,2.05);
        part(box,m.stoneBright,-.82,.036,-.8,.31,.013,.23);
        part(box,m.stoneBright,.75,.036,.7,.27,.013,.34);
      }else if(kind==='fort-wall'){
        part(box,m.stone,0,height*.43,0,3.08,height*.86,.4);
        part(box,m.stoneBright,0,height*.87,0,3.14,.16,.46);
        for(let i=-2;i<=2;i++)part(box,m.stoneBright,i*.65,height*.99,0,.35,height*.24,.48);
      }else if(kind==='fort-watchtower'){
        part(tower,m.stone,0,height*.43,0,.83,height*.86,.83);
        part(tower,m.stoneBright,0,height*.87,0,1.03,.24,1.03);
        for(let i=0;i<6;i++){
          const a=i*Math.PI/3;
          part(box,m.stoneBright,Math.cos(a)*.83,height*.98,Math.sin(a)*.83,.33,.45,.34,a);
        }
        part(box,m.banner,.08,height+1.02,0,.055,1.72,.055);
        part(box,m.banner,.43,height+1.56,0,.7,.37,.055);
      }else if(kind==='fort-gatehouse'){
        for(const x of [-1.3,1.3]){
          part(box,m.stone,x,height*.37,0,.78,height*.74,1.25);
          part(box,m.stoneBright,x,height*.78,0,1.03,.24,1.45);
          part(roof,m.tile,x,height*.97,0,.89,.78,.92,Math.PI/4);
        }
        part(box,m.stone,0,height*.73,0,2.5,.5,.95);
        for(let i=-2;i<=2;i++)part(box,m.stoneBright,i*.54,height*.96,0,.29,.35,1.03);
        part(box,m.darkWood,-.92,height*.27,.51,.1,height*.53,.08);
        part(box,m.darkWood,.92,height*.27,.51,.1,height*.53,.08);
       }else if(kind==='fort-trebuchet'){
        part(box,m.timber,0,.25,0,2.8,.38,2.0);
        for(const x of [-1.05,1.05])for(const z of [-.8,.8])
          part(tower,m.darkWood,x,.27,z,.4,.42,.4,Math.PI/2);
        part(box,m.darkWood,0,height*.4,0,.3,height*.8,.35);
        part(box,m.timber,.6,height*.82,0,.25,height*1.3,.28,.35);
        part(box,m.stone,1.15,height*1.33,0,.5,.5,.5);
      }else if(kind==='fort-ram'){
        part(box,m.timber,0,.65,0,2.5,1.1,2.1);
        part(roof,m.cloth,0,1.6,0,1.9,.85,1.5,Math.PI/4);
        part(box,m.darkWood,-1.65,.57,0,2.1,.33,.4);
        for(const x of [-.95,.95])for(const z of [-.78,.78])
          part(tower,m.darkWood,x,.17,z,.34,.32,.34,Math.PI/2);
      }else if(kind==='fort-siege-tower'){
        part(box,m.timber,0,height*.46,0,2.35,height*.89,2.1);
        part(box,m.darkWood,0,height*.92,.9,2.5,.19,.35);
        for(const x of [-.97,.97])for(const z of [-.88,.88])
          part(box,m.darkWood,x,height*.5,z,.17,height,.18);
        for(const x of [-.9,.9])part(tower,m.darkWood,x,.2,0,.39,.36,.39,Math.PI/2);
      }else if(kind==='fort-keep'){
        const body=height*.82;
        part(box,m.stone,0,body*.5,0,3.2,body,3.0);
        part(box,m.stoneBright,0,body+.12,0,3.4,.27,3.2);
        for(const x of [-1.46,1.46])for(const z of [-1.35,1.35]){
          part(box,m.stoneBright,x,body+.34,z,.45,.5,.46);
        }
        part(box,m.darkWood,0,.58,1.52,.7,1.14,.11);
        for(const x of [-.88,.88]){
          part(box,m.darkWood,x,body*.62,1.55,.19,.42,.07);
          part(box,m.darkWood,x,body*.62,-1.55,.19,.42,.07);
        }
        part(box,m.banner,0,height+.27,0,.055,.92,.055);
        part(box,m.banner,.46,height+.45,0,.86,.28,.065);
      }else if(kind==='fort-cottage'||kind==='fort-barracks'||kind==='fort-workshop'){
        const large=kind==='fort-barracks',work=kind==='fort-workshop';
        const w=large?3.4:work?2.7:3.0;
        const depth=large?2.8:2.4,body=height*.58;
        part(box,large?m.stone:m.plaster,0,body*.5,0,w,body,depth);
        for(const x of [-w*.38,w*.38]){
          part(box,m.darkWood,x,body*.5,depth*.5+.04,.14,body,.13);
        }
        part(box,m.darkWood,0,.48,depth*.5+.07,.58,.96,.09);
        part(box,m.darkWood,0,body*.78,depth*.5+.055,w,.12,.12);
        part(box,m.darkWood,0,body*.1,depth*.5+.055,w,.13,.12);
        for(const x of [-w*.28,w*.28]){
          part(box,m.darkWood,x,body*.57,depth*.5+.08,.33,.42,.08);
          part(box,m.cloth,x,body*.57,depth*.5+.13,.23,.29,.025);
        }
        part(roof,large?m.cloth:m.tile,0,body+height*.19,0,
          w*.8,height*.38,depth*.89,Math.PI/4);
        if(work){
          part(box,m.timber,1.0,.42,1.5,.8,.84,.72);
          part(box,m.darkWood,1.0,.89,1.5,.93,.15,.83);
        }
      }else if(kind==='fort-market'){
        part(box,m.timber,0,.12,0,3.1,.22,2.4);
        for(const x of [-1.35,1.35])for(const z of [-.98,.98]){
          part(box,m.darkWood,x,height*.4,z,.16,height*.8,.16);
        }
        part(roof,m.cloth,0,height*.86,0,2.33,.8,1.85,Math.PI/4);
        part(box,m.timber,-.63,.39,.16,.85,.57,.67);
        part(box,m.stoneBright,.65,.44,-.35,.64,.69,.62);
      }
      return group;
    }
    const original=this.models3d.get(kind);
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
    const now=performance.now(),minInterval=this.width<650?40:game.grandSiege?33:25;
    if(now-this.last3dPaint<minInterval)return;
    this.last3dPaint=now;
    try{
      const player=game.player,visibleIds=new Set();
      // 그래픽 최적화: 대공성전 전체 보기에서는 성문을 중심으로 월드 좌표를 선별한다.
      const focus=game.siegeOverview?this.viewFocus:player;
      const zoom=game.siegeOverview?(this.viewZoom??this.defaultStrategyZoom()):(this.width<600?.68:.82);
      if(this.camera3.zoom!==zoom){this.camera3.zoom=zoom;this.camera3.updateProjectionMatrix()}
      const halfWidth=this.width/(2*zoom),halfDepth=this.height/(2*zoom*Math.sin(ISO_PITCH));
      const reachX=Math.cos(ISO_YAW)*halfWidth+Math.sin(ISO_YAW)*halfDepth+240;
      const reachY=Math.sin(ISO_YAW)*halfWidth+Math.cos(ISO_YAW)*halfDepth+240;
      const nearby=(x,y)=>Math.abs(x-focus.x)<reachX&&Math.abs(y-focus.y)<reachY;
      const put=(id,kind,x,y,height=2,rotation=0)=>{
        if(!Number.isFinite(x)||!Number.isFinite(y)||!nearby(x,y))return;
        visibleIds.add(id);
        const loaded=this.models3d.has(kind);
        let item=this.instances3d.get(id);
        if(item&&(item.kind!==kind||item.loaded!==loaded||item.height!==height)){
          this.scene3.remove(item.mesh);this.instances3d.delete(id);item=null;
        }
        if(!item){const mesh=this.make3d(kind,height);
          this.scene3.add(mesh);item={mesh,kind,loaded,height};this.instances3d.set(id,item)}
        item.mesh.position.set(x*SC,.03,y*SC);
        item.mesh.rotation.y=rotation;
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
      put('home','fort-cottage',765,350,4.8);
      put('market','fort-market',game.workerShop.x,game.workerShop.y,3.0);
      const production=game.state.productionBuildings||{},village=game.state.villageDevelopment||{};
      put('lumber',production.lumberBuilt?'fort-workshop':'package',245,850,production.lumberBuilt?2.9:1.0);
      put('mine',production.mineBuilt?'fort-workshop':'stone',785,965,production.mineBuilt?2.9:1.2);
      const fort=village.fortification||{},walls=fort.walls||{};
      if(this.moat3)this.moat3.visible=!!village.townHallBuilt&&!!fort.moatBuilt;
      if(village.townHallBuilt&&fort.moatBuilt){
        if(fort.drawbridgeClosed!==false)put('fort-raised-bridge','gate',1400,608,2.7,Math.PI/2);
        else put('fort-lowered-bridge','bench',1430,608,1.4,Math.PI/2);
      }
      const tier=Math.max(1,Math.min(3,Number(fort.wallTier)||1));
      const wallHeight=2+(tier-1)*.65,gateHeight=3.25+(tier-1)*.38;
      if(village.defenseTowerBuilt)put('defense-tower','fort-watchtower',400,1090,3.9+(tier-1)*.36);
      if(village.townHallBuilt)put('townhall','fort-keep',1010,1090,5.4+
        (game.state.townHallExpansion?.upgraded?1.15:0)+(tier-1)*.5);
      // 메인: 실제 성벽 체력이 0이면 해당 구간이 무너져 통로가 열린다.
      // 병력·트랩 공격 판정은 마을 방어 책임 모듈에서 처리한다.
      if(village.townHallBuilt){
        for(let i=0;i<8;i++){
          if(i===3||i===4)continue;
          if((walls.north??1)>0)put('fort-north:'+i,'fort-wall',384+i*113,210,wallHeight);
        }
        if((walls.north??1)>0)put('fort-north-gate','fort-gatehouse',780,210,gateHeight);
        for(let i=0;i<5;i++){
          if((walls.south??1)>0)put('fort-west:'+i,'fort-wall',250,310+i*113,wallHeight,Math.PI/2);
          if(i!==2&&(i<2?(walls.north??1)>0:(walls.south??1)>0))
            put('fort-east:'+i,'fort-wall',1310,310+i*113,wallHeight,Math.PI/2);
        }
        if((walls.gate??1)>0)put('fort-east-gate','fort-gatehouse',1310,600,gateHeight,Math.PI/2);
        else put('fort-east-breach','stone',1310,600,.5);
        if((walls.south??1)>0){
          put('fort-south-west','fort-wall',580,1030,wallHeight);
          put('fort-south-mid','fort-wall',740,1030,wallHeight);
        }
        if(tier>=2){
          put('fort-secondary-tower','fort-watchtower',1265,955,3.8+(tier-1)*.42);
          put('fort-inner-wall','fort-wall',990,955,wallHeight);
        }
        if(tier>=3){
          put('fort-bastion','fort-watchtower',1180,305,4.7);
          put('fort-rear-wall','fort-wall',415,1015,wallHeight);
        }
        for(let i=0;i<(fort.traps?.length||0);i++){
          const trap=fort.traps[i],sites=[[1470,430],[1440,540],[1450,650],[1460,770],[1500,865],[1560,620]];
          if(!trap||!sites[i])continue;
          // 그래픽: 새로운 임의 원시 모델 대신 기존 CC0 3D 소품 자산을 재배치한다.
          const kind={spikes:'fence',pit:'stone',net:'fence',oil:'package',log:'bench',barrel:'package'}[trap.type];
          if(kind)put('fort-trap:'+i,kind,sites[i][0],sites[i][1],
            trap.type==='spikes'?1.45:trap.type==='oil'?1.25:.9,
            trap.type==='net'?Math.PI/2:0);
        }
        if((game.state.workers||0)>0)
          put('fort-farm-home','fort-cottage',635,810,3.1);
        if(game.state.productionBuildings?.lumberBuilt)
          put('fort-storehouse','fort-workshop',390,820,3.8);
      }
      if(village.defenseTowerBuilt&&village.townHallBuilt){
        if((walls.north??1)>0)put('fort-corner-nw','fort-watchtower',250,210,3.8+(tier-1)*.5);
        if((walls.north??1)>0)put('fort-corner-ne','fort-watchtower',1310,210,3.8+(tier-1)*.5);
      }
      // 성곽 안 길은 시각 요소뿐이며 기존 이동·상호작용 좌표는 그대로 사용.
      for(let i=0;i<7;i++)put('fort-road:'+i,'fort-road',755,465+i*72,.05);
      if(game.state.seedDepot?.built)put('seed-depot','package',835,505,1.3);
      if(game.state.smithy)put('smithy','bench',790,1080,2.1);
      if(game.state.darknessFlameV19?.blackMineBuilt)put('black-mine','house',-880,690,3.6);
      if(game.state.abyssCaveV23?.researchLabBuilt)put('research-lab','house',-690,420,4);
      put('barracks',game.state.barracksBuilt?'fort-barracks':'package',
        game.barracks.x,game.barracks.y,3);
      put('ship','bench',775,760,1.4);put('fishing','bench',520,430,1.4);
      if((fort.traderClock??180)%180<75){
        put('merchant','npc',845,775,1.9);
        put('merchant-cargo','package',880,795,1.3);
      }
      if(!game.state.expanded&&!village.townHallBuilt)put('east-gate','fort-gatehouse',1325,600,3.0);
      if(jungle)put('jungle-gate','fort-gatehouse',2170,1080,3.0);
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
      // 메인: 186명 모두 전투 판정하지만 가까운 최대 84/156명만 실제 3D 모델로 생성한다.
      // 기존 CC0 메시를 재사용하며 전투 계산은 렌더링 축소의 영향을 받지 않는다.
      const modelBudget=this.width<600?32:this.width<900?56:96;
      const visibleEnemies=game.enemies.filter(u=>u.hp>0&&nearby(u.x,u.y))
        .sort((a,b)=>(a.x-focus.x)**2+(a.y-focus.y)**2-
          ((b.x-focus.x)**2+(b.y-focus.y)**2)).slice(0,modelBudget);
      for(const unit of visibleEnemies){
        const kind=unit.kind==='ram'?'fort-ram':
          unit.kind==='siegeTower'?'fort-siege-tower':
          unit.kind==='trebuchet'?'fort-trebuchet':
          unit.kind==='sapper'?'npc':unit.kind==='ladder'?'soldier':'enemy';
        put('enemy:'+unit.id,kind,unit.x,unit.y,
          unit.kind==='siegeTower'?4.7:unit.kind==='trebuchet'?3.5:unit.kind==='ram'?3.3:unit.boss?2.5:1.9);
      }
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
      if(!village.townHallBuilt)for(let i=0;i<5;i++){
        put('fence:'+i,'fence',1150+i*38,185,1.1);
      }
      put('player','hero',player.x,player.y,1.9);
      for(const [id,item] of this.instances3d)if(!visibleIds.has(id)){
        this.scene3.remove(item.mesh);this.instances3d.delete(id);
      }
      // 메인: 원작의 2:1 사선 구도. 같은 카메라를 터치·드래그·이동 변환에 사용한다.
      const focusX=focus.x*SC,focusZ=focus.y*SC;
      const distance=95,groundDistance=distance*Math.cos(ISO_PITCH);
      this.camera3.position.set(focusX+Math.sin(ISO_YAW)*groundDistance,
        distance*Math.sin(ISO_PITCH),focusZ+Math.cos(ISO_YAW)*groundDistance);
      this.camera3.lookAt(focusX,0,focusZ);
      this.camera3.updateMatrixWorld();
      const hour=game.state.minutes/60;
      this.scene3.background.setHex(hour<6||hour>20?0x35494d:0x6c9799);
      this.gl.render(this.scene3,this.camera3);
    }catch(error){
      console.error('포근섬 3D 렌더링 실패',error);
      this.native3d=false;if(this.gl?.domElement)this.gl.domElement.hidden=true;
      const status=document.querySelector('#webglStatus');
      if(status){status.textContent='3D 표시 오류가 발생했어. 화면을 새로고침해 줘.';status.hidden=false}
    }
  }
  resize() {
    this.dpr = 1;
    this.width = Math.max(1, window.innerWidth);
    this.height = Math.max(1, window.innerHeight);
    // 이전 확장 스크립트의 2D 캔버스 API만 유지하고 화면 버퍼는 최소 크기로 둔다.
    this.canvas.width = 1;
    this.canvas.height = 1;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.ctx.setTransform(this.dpr,0,0,this.dpr,0,0);
    if(this.native3d){
      // 월드만 정수 배율로 확장하고 UI·터치 좌표는 원래 화면 해상도를 유지한다.
      this.pixelScale=this.width>=1440?3:2;
      this.gl.setPixelRatio(1);
      this.gl.setSize(Math.ceil(this.width/this.pixelScale),Math.ceil(this.height/this.pixelScale),false);
      this.gl.domElement.dataset.pixelScale=String(this.pixelScale);
      this.camera3.left=-this.width*SC/2;this.camera3.right=this.width*SC/2;
      this.camera3.top=this.height*SC/2;this.camera3.bottom=-this.height*SC/2;
      // 시야: 모바일도 성곽과 건물 배치가 보이도록 넓히되 성능·저장 로직은 건드리지 않는다.
      this.camera3.zoom=this.width<600?.68:.82;
      this.camera3.updateProjectionMatrix();
    }
  }
  defaultStrategyZoom(){return Math.max(.21,Math.min(.58,this.width/1500,this.height/1450))}
  panCamera(dx,dy){
    const zoom=this.viewZoom??this.defaultStrategyZoom();
    const x=(Math.cos(ISO_YAW)*dx+Math.sin(ISO_YAW)*dy/Math.sin(ISO_PITCH))/zoom;
    const y=(-Math.sin(ISO_YAW)*dx+Math.cos(ISO_YAW)*dy/Math.sin(ISO_PITCH))/zoom;
    this.viewFocus.x=Math.max(-3000,Math.min(7800,this.viewFocus.x-x));
    this.viewFocus.y=Math.max(-1100,Math.min(2600,this.viewFocus.y-y));
  }
  screenDirectionToWorld(dx,dy){
    const x=Math.cos(ISO_YAW)*dx+Math.sin(ISO_YAW)*dy/Math.sin(ISO_PITCH);
    const y=-Math.sin(ISO_YAW)*dx+Math.cos(ISO_YAW)*dy/Math.sin(ISO_PITCH);
    const length=Math.hypot(x,y)||1;return {x:x/length,y:y/length};
  }
  changeZoom(factor){
    const current=this.viewZoom??this.defaultStrategyZoom();
    this.viewZoom=Math.max(.19,Math.min(1.15,current*factor));
  }
  centerCamera(){this.viewFocus={x:1050,y:635};this.viewZoom=null}
  camera(game) { return { x: game.player.x - this.width/2, y: game.player.y - this.height/2 }; }
  screenToWorld(game, sx, sy) {
    if(!this.native3d){const c=this.camera(game);return {x:sx+c.x,y:sy+c.y}}
    // 입력: 기울어진 카메라의 화면 터치를 실제 지면 좌표로 변환한다.
    const bounds=this.canvas.getBoundingClientRect();
    const pointer=new THREE.Vector2((sx-bounds.left)/bounds.width*2-1,
      1-(sy-bounds.top)/bounds.height*2);
    const ray=new THREE.Raycaster();ray.setFromCamera(pointer,this.camera3);
    const hit=new THREE.Vector3();
    if(ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),0),hit))
      return {x:hit.x/SC,y:hit.z/SC};
    return {x:game.player.x,y:game.player.y};
  }
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

