// 파일명: web-games/cozy-island/render-v3.js
// 임포트: 기존 월드 좌표·깊이 정렬은 유지하고 새 중세 픽셀 아트를 연결한다.
import * as THREE from '../../assets/roblox/world-ghosts/native/mesh/three/three.module.js';
import { findWorkerRoute } from './castle-layout.js';
// 건물 외형: 경제 건물의 저장 구조를 바꾸지 않는 입체 모델 매핑.
export const ECONOMY_3D_LOOK=Object.freeze({
 lumber:'fort-lumber',quarry:'fort-quarry',iron:'fort-iron',stockpile:'fort-stockpile',
 granary:'fort-granary',mill:'fort-mill',bakery:'fort-bakery',orchard:'fort-orchard',
 dairy:'fort-dairy',wheat:'fort-wheat',vineyard:'fort-vineyard',winery:'fort-winery',
 hops:'fort-hops',brewery:'fort-brewery',tavern:'fort-tavern',hovel:'fort-hovel',
 well:'fort-well',market:'fort-market',fletcher:'fort-fletcher',
 smith:'fort-smith',armory:'fort-armory'
});
const SC=1/36;
// 카메라: 45도 방위·30도 고도의 2:1 등각 투영. 게임 좌표는 그대로 유지한다.
const ISO_YAW=Math.PI/4,ISO_PITCH=Math.PI/6;
// 원본 모델 연결 제거: 새 중세 픽셀 아트와 방향별 프레임만 사용한다.
const PIXEL_ART=Object.freeze({
  "tree": {
    "file": "oaktree.png",
    "bounds": [
      3,
      3,
      172,
      145
    ]
  },
  "tree_large": {
    "file": "pinetree.png",
    "bounds": [
      2,
      8,
      61,
      139
    ]
  },
  "crop": {
    "file": "crops.png",
    "bounds": [
      0,
      7,
      128,
      83
    ]
  },
  "house": {
    "file": "house1-0.png",
    "bounds": [
      15,
      45,
      255,
      270
    ]
  },
  "fort-cottage": {
    "file": "house1-0.png",
    "bounds": [
      15,
      45,
      255,
      270
    ]
  },
  "fort-barracks": {
    "file": "house2-0.png",
    "bounds": [
      103,
      112,
      292,
      326
    ]
  },
  "fort-workshop": {
    "file": "house1-2.png",
    "bounds": [
      30,
      44,
      255,
      267
    ]
  },
  "fort-market": {
    "file": "tavern.png",
    "bounds": [
      0,
      3,
      128,
      154
    ]
  },
  "fort-keep": {
    "file": "keep.png",
    "bounds": [
      0,
      0,
      500,
      422
    ]
  },
  "fort-watchtower": {
    "file": "watchtower.png",
    "bounds": [
      0,
      12,
      128,
      167
    ]
  },
  "fort-gatehouse": {
    "file": "castle.png",
    "bounds": [
      130,
      180,
      220,
      160
    ]
  },
  "fort-wall": {
    "file": "wal0000.png",
    "bounds": [
      6,
      11,
      96,
      103
    ]
  },
  "fort-wall-side": {
    "file": "wal0001.png",
    "bounds": [
      6,
      10,
      96,
      104
    ]
  },
  "fort-road": {
    "file": "marblepath.png",
    "bounds": [
      0,
      2,
      128,
      68
    ]
  },
  "hero": {
    "file": "CitizenSheet.png",
    "columns": 12,
    "rows": 5,
    "row": 4,
    "frames": 3,
    "directions": 4
  },
  "npc": {
    "file": "CitizenSheet.png",
    "columns": 12,
    "rows": 5,
    "row": 0,
    "frames": 3,
    "directions": 4
  },
  "soldier": {
    "file": "CitizenSheet.png",
    "columns": 12,
    "rows": 5,
    "row": 4,
    "frames": 3,
    "directions": 4
  },
  "enemy": {
    "file": "CitizenSheet.png",
    "columns": 12,
    "rows": 5,
    "row": 3,
    "frames": 3,
    "directions": 4
  },
  "wizard": {
    "file": "CitizenSheet.png",
    "columns": 12,
    "rows": 5,
    "row": 4,
    "frames": 3,
    "directions": 4
  },
  "stone": {
    "procedural": true,
    "animated": false
  },
  "flower": {
    "procedural": true,
    "animated": false
  },
  "package": {
    "procedural": true,
    "animated": false
  },
  "bench": {
    "procedural": true,
    "animated": false
  },
  "gate": {
    "procedural": true,
    "animated": false
  },
  "fence": {
    "procedural": true,
    "animated": false
  },
  "ship": {
    "procedural": true,
    "animated": false
  },
  "dock": {
    "procedural": true,
    "animated": false
  },
  "wolf": {
    "procedural": true,
    "animated": true
  },
  "boar": {
    "procedural": true,
    "animated": true
  },
  "snake": {
    "procedural": true,
    "animated": true
  },
  "spider": {
    "procedural": true,
    "animated": true
  },
  "bat": {
    "procedural": true,
    "animated": true
  },
  "golem": {
    "procedural": true,
    "animated": false
  },
  "fort-ram": {
    "procedural": true,
    "animated": false
  },
  "fort-trebuchet": {
    "procedural": true,
    "animated": false
  },
  "fort-siege-tower": {
    "procedural": true,
    "animated": false
  }
});
export class IslandRendererV3 {
  constructor(canvas) {
    this.canvas = canvas;
    // 기존 2D 캔버스는 확장 모듈의 좌표·입력 처리 전용으로만 유지한다.
    // 실제 월드는 WebGL 3D만 표시하며 2D로 되돌아가지 않는다.
    this.ctx = canvas.getContext('2d', { alpha: true });
    this.models3d=new Map();this.instances3d=new Map();this.native3d=false;
    this.viewFocus={x:925,y:630};this.viewZoom=null;this.last3dPaint=0;
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
      const ground=(w,d,x,y,color,elevation)=>{
        const kind=elevation<=-1?'water':color===0x414958?'rock':
          color===0x846964?'rock':elevation<-.5?'sand':'grass';
        const map=this.pixelTexture(kind).clone();
        map.repeat.set(w/180,d/180);map.needsUpdate=true;
        // 섬 표면을 둥근 해안 평면으로 교체한다. 이동 판정용 월드 좌표는 바꾸지 않는다.
        const width=w*SC,depth=d*SC,radius=Math.min(85*SC,width*.12,depth*.12);
        const left=-width/2,right=width/2,bottom=-depth/2,top=depth/2;
        const shape=new THREE.Shape();
        shape.moveTo(left+radius,bottom);shape.lineTo(right-radius,bottom);
        shape.quadraticCurveTo(right,bottom,right,bottom+radius);
        shape.lineTo(right,top-radius);shape.quadraticCurveTo(right,top,right-radius,top);
        shape.lineTo(left+radius,top);shape.quadraticCurveTo(left,top,left,top-radius);
        shape.lineTo(left,bottom+radius);shape.quadraticCurveTo(left,bottom,left+radius,bottom);
        const geometry=new THREE.ShapeGeometry(shape,6),positions=geometry.attributes.position;
        const uv=geometry.attributes.uv;
        for(let i=0;i<positions.count;i++)uv.setXY(i,positions.getX(i)/width+.5,positions.getY(i)/depth+.5);
        const mesh=new THREE.Mesh(geometry,new THREE.MeshLambertMaterial({color,map,side:THREE.DoubleSide}));
        mesh.rotation.x=-Math.PI/2;
        mesh.position.set(x*SC,elevation+.225,y*SC);this.scene3.add(mesh);return mesh;
      };
      // 네 영주의 성이 겹치지 않는 네 왕국. 잔디·고산·암석·황토 지형은 겹치되
      // 동일한 배경 타일이 월드 전체를 덮지 않도록 높이와 색을 달리한다.
      ground(13000,9900,1100,-950,0x638e9b,-1.35); // 수평선/해안
      ground(12200,9150,1100,-950,0xb7ad80,-.88); // 넓게 연결된 중앙 대륙
      ground(11450,8580,1100,-950,0x939c68,-.72);
      ground(3900,3050,850,600,0x809a64,-.32); // 내 성 · 푸른 평야
      ground(3100,2800,4450,950,0xc49a62,-.29); // 동쪽 · 붉은 바위협곡
      ground(3000,2800,4450,-2750,0xa5b0ae,-.27); // 북동 · 설산
      ground(3250,3050,-2700,-2650,0xb6a067,-.30); // 북서 · 황금 초원
      ground(1600,880,2350,-1200,0x6e8760,-.21); // 국경 숲
      ground(1500,730,-800,-900,0x87975c,-.22); // 완충 삼림
      ground(1400,680,2400,-3180,0xaebbb3,-.19); // 북부 고지
      ground(1450,640,-900,-2900,0xc1a86e,-.18); // 황토 고원
      // 얕은 강은 3D 표면 위에 놓고 지형과 다른 물결 텍스처를 가진다.
      const river=(w,d,x,y,angle=0)=>{
        const material=new THREE.MeshLambertMaterial({color:0x739c9b,map:this.pixelTexture('water'),side:THREE.DoubleSide});
        const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w*SC,d*SC),material);
        mesh.rotation.x=-Math.PI/2;mesh.rotation.z=angle;
        mesh.position.set(x*SC,.18,y*SC);this.scene3.add(mesh);return mesh;
      };
      river(4000,110,1740,-1900,.19);
      river(2900,92,-1180,-1230,-.28);
      // 기존 지역 게임 모듈이 기대하는 지형 참조는 새 지형에서 유지한다.
      this.frontier3=ground(1900,1200,2420,540,0xb8ab77,-.39);
      this.frontierGrass3=ground(1800,1150,2430,550,0x8f9960,-.25);
      this.east3=ground(880,680,2100,595,0xbfa36e,-.35);
      this.eastGrass3=ground(780,590,2100,595,0x88a16b,-.22);
      this.jungle3=ground(1260,900,2120,1550,0xa5ab79,-.33);
      this.jungleGrass3=ground(1200,840,2120,1560,0x63875d,-.21);
      this.north3=ground(1200,850,2115,-350,0xd2d8c5,-.35);
      this.northGrass3=ground(1140,810,2115,-350,0x98b0a2,-.21);
      this.west3=ground(1890,730,-1342,595,0xc3b078,-.35);
      this.westGrass3=ground(1830,680,-1342,595,0x8fa377,-.21);
      this.volcano3=ground(1460,880,3540,-300,0x836c63,-.26);
      this.cave3=ground(1850,850,6100,-300,0x777d7b,-.26);
      this.jungleWest3=ground(1100,780,892,1610,0x5a875c,-.21);
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
  // 완전 불투명한 지형 텍스처: 중세 타일셋 투명 픽셀이 검은 지형으로 보이던 결함 제거.
  pixelTexture(kind='grass'){
    if(this.pixelTextures.has(kind))return this.pixelTextures.get(kind);
    const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
    const ctx=canvas.getContext('2d',{alpha:false});
    const palette={
      grass:['#687a42','#71864b','#7b8a50','#5f7740','#889459','#677f48'],
      sand:['#ba9869','#c6a777','#d1b785','#ac8d60','#c1a16e','#a88f64'],
      road:['#a59c83','#bbb096','#9b937d','#cac0a5','#877f6c','#a99c85'],
      rock:['#747775','#8c8d84','#626965','#a0a095','#80857e','#747c76'],
      water:['#638b8a','#6f9895','#6a9392','#5f898a','#739b9b','#638e91']
    }[kind]||['#a18c6d','#b6a181','#a48c6a'];
    ctx.fillStyle=palette[0];ctx.fillRect(0,0,128,128);
    const noise=(x,y)=>((Math.imul(x+37,374761393)^Math.imul(y+23,668265263))>>>0);
    if(kind==='rock'||kind==='road'){
      for(let row=0;row<8;row++)for(let col=-1;col<9;col++){
        const x=col*17+(row%2)*8,y=row*16;
        ctx.fillStyle='#615f55';ctx.fillRect(x+1,y+1,15,14);
        ctx.fillStyle=palette[noise(col+17,row)%palette.length];ctx.fillRect(x+2,y+2,13,12);
      }
    }else for(let y=0;y<128;y+=2)for(let x=0;x<128;x+=2){
      const n=noise(x,y);
      if(n%9<4){ctx.fillStyle=palette[(n>>>3)%palette.length];ctx.fillRect(x,y,n%5===0?3:2,2)}
      if(kind==='grass'&&n%41===0){ctx.fillStyle='#b5a979';ctx.fillRect(x,y-2,1,4);ctx.fillRect(x-1,y,3,1)}
      if(kind==='sand'&&n%43===0){ctx.fillStyle='#ead2a3';ctx.fillRect(x,y,3,1)}
      if(kind==='water'&&n%31===0){ctx.fillStyle='#a0bbb5';ctx.fillRect(x,y,8,1)}
    }
    const texture=new THREE.CanvasTexture(canvas);
    texture.magFilter=THREE.NearestFilter;texture.minFilter=THREE.LinearFilter;
    texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
    texture.colorSpace=THREE.SRGBColorSpace;
    this.pixelTextures.set(kind,texture);return texture;
  }
  // 자산: 같은 원본 이미지는 한 번만 적재하고 기존 모델·원시 도형은 생성하지 않는다.
  async load3dModels(){
    await new Promise(resolve=>requestAnimationFrame(resolve));
    const images=new Map(),loader=new THREE.TextureLoader();
    await Promise.all(Object.entries(PIXEL_ART).map(async ([kind,spec])=>{
      try{
        let texture;
        if(spec.procedural){texture=new THREE.CanvasTexture(this.paintPixelSprite(kind));}
        else{
          if(!images.has(spec.file))images.set(spec.file,loader.loadAsync(
            new URL('../../assets/shared/medieval/'+spec.file,import.meta.url).href));
          texture=await images.get(spec.file);
        }
        texture.magFilter=texture.minFilter=THREE.NearestFilter;
        texture.generateMipmaps=false;texture.colorSpace=THREE.SRGBColorSpace;
        const animated=spec.animated?{frames:3,directions:4,columns:12,rows:1,row:0}:{};
        this.models3d.set(kind,{...spec,...animated,texture});
      }catch(error){console.warn('포근섬 중세 픽셀 자산 로딩 실패: '+kind,error);}
    }));
  }
  // 그래픽: 전투·저장 값에 관여하지 않는 신규 야생동물·공성기·자원 픽셀 아트.
  paintPixelSprite(kind){
    const moving=['wolf','boar','snake','spider','bat'].includes(kind);
    const siege=kind.startsWith('fort-');
    const cell=siege?96:64,canvas=document.createElement('canvas');
    canvas.width=cell*(moving?12:1);canvas.height=cell;
    const c=canvas.getContext('2d');c.imageSmoothingEnabled=false;
    for(let frame=0;frame<(moving?12:1);frame++){
      c.save();c.translate(frame*cell,0);
      if(moving&&Math.floor(frame/3)===1){c.translate(cell,0);c.scale(-1,1);}
      const rect=(x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(x,y,w,h);};
      const poly=(points,color)=>{c.fillStyle=color;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();};
      const line=(x,y,x2,y2,color,width=1)=>{c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(x,y);c.lineTo(x2,y2);c.stroke();};
      const stride=moving?[0,3,-2][frame%3]:0;
      if(siege){
        const wheel=(x,y)=>{rect(x-5,y-7,10,14,'#352a1e');rect(x-3,y-5,6,10,'#8d6943');line(x-3,y,x+3,y,'#c49b5b');line(x,y-5,x,y+5,'#493623');};
        const beam=(x,y,w,h)=>{rect(x,y,w,h,'#3c2d20');rect(x+1,y+1,w-2,h-2,'#8c693f');line(x+2,y+1,x+w-2,y+1,'#c09a62');};
        poly([[13,72],[58,53],[86,67],[42,88]],'#302b22');
        wheel(28,78);wheel(71,72);beam(20,65,57,8);
        if(kind==='fort-siege-tower'){
          poly([[24,66],[57,51],[57,12],[24,26]],'#987447');
          poly([[57,51],[78,62],[78,23],[57,12]],'#655033');
          for(let y=28;y<67;y+=7)line(25,y,56,y-14,'#453623');
          for(let y=21;y<56;y+=7)line(59,y,77,y+10,'#463423');
          beam(23,24,4,43);beam(55,10,4,43);beam(76,21,4,42);
          poly([[20,23],[57,6],[83,20],[45,37]],'#aa8650');
          for(let x=25;x<80;x+=11)beam(x,Math.round(16+Math.abs(x-56)*.42),6,8);
          line(34,34,34,66,'#d5ba7c',2);line(43,30,43,62,'#d5ba7c',2);
          for(let y=38;y<65;y+=6)line(34,y,43,y-4,'#d5ba7c',2);
        }else if(kind==='fort-trebuchet'){
          beam(34,30,6,39);beam(61,25,6,39);
          line(37,31,19,68,'#bc9458',4);line(64,27,79,67,'#705332',4);
          line(26,12,73,53,'#d0a46b',5);rect(20,5,15,17,'#4b4234');rect(21,7,12,12,'#b2a27f');
          line(72,53,85,61,'#d9ca93');line(81,61,89,66,'#3f3529',4);
        }else{
          beam(20,43,4,27);beam(73,40,4,27);
          poly([[13,43],[47,24],[83,41],[49,60]],'#4c4a35');
          poly([[13,43],[49,60],[49,69],[13,51]],'#77764e');
          for(let x=20;x<75;x+=8)line(x,43-Math.abs(x-47)*.2,x+12,48,'#a49d69');
          line(22,64,82,43,'#4c3622',9);line(22,62,82,41,'#c0995d',3);rect(13,62,12,8,'#9d9e90');
        }
      }else if(kind==='wolf'||kind==='boar'){
        const boar=kind==='boar',dark=boar?'#493e30':'#505350',mid=boar?'#766049':'#939389',light=boar?'#ad8c63':'#c3c2ad';
        poly([[13,30],[22,23],[39,24],[46,31],[43,44],[18,44]],dark);
        poly([[15,30],[24,26],[39,28],[43,35],[35,39],[19,38]],mid);
        rect(18+stride,40,5,14,dark);rect(34-stride,40,5,14,dark);rect(20+stride,40,2,10,light);rect(36-stride,40,2,10,mid);
        poly([[36,27],[42,15],[48,22],[55,24],[59,30],[53,35],[42,36]],mid);
        poly([[42,19],[43,11],[48,20]],dark);rect(53,25,3,2,'#1e201c');rect(56,30,5,3,dark);
        if(boar){line(56,34,60,29,'#e4d3ac',2);for(let x=18;x<41;x+=4)rect(x,22,2,4,dark);}
        else{poly([[14,30],[5,22],[7,31],[15,36]],dark);poly([[43,31],[51,35],[44,40],[39,34]],light);}
        for(let i=0;i<13;i++)rect(17+(i*7)%25,28+(i*5)%10,2,1,i%2?light:dark);
      }else if(kind==='snake'){
        for(let i=0;i<12;i++){const x=8+i*4,y=35+Math.round(Math.sin(i*.65+stride*.3)*5);rect(x,y,6,6,'#3c4b2e');rect(x,y,5,2,'#a0a362');}
        rect(50,30,10,8,'#737e47');rect(57,31,2,2,'#211e13');
      }else if(kind==='spider'){
        for(let i=0;i<4;i++){line(28,32,10,20+i*7,'#4a352e',2);line(36,32,55,20+i*7,'#4a352e',2);}
        poly([[23,26],[32,21],[42,28],[42,38],[32,43],[22,36]],'#6b4a38');rect(28,29,10,8,'#a17e59');rect(29,24,2,2,'#cfb271');
      }else if(kind==='bat'){
        const lift=stride*2;poly([[30,30],[7,16+lift],[5,38],[16,32],[23,40]],'#55433b');poly([[34,30],[57,16+lift],[59,38],[48,32],[41,40]],'#55433b');
        rect(27,26,10,18,'#322f2c');rect(27,20,3,7,'#46372f');rect(34,20,3,7,'#46372f');rect(29,29,2,2,'#c9bba1');
      }else if(kind==='stone'||kind==='golem'){
        poly([[8,49],[12,30],[28,17],[45,22],[56,43],[48,55],[24,58]],'#625e50');poly([[12,30],[28,17],[45,22],[33,36]],'#bcb39a');poly([[12,31],[33,36],[25,55],[9,49]],'#97957f');poly([[34,36],[45,23],[54,43],[46,53],[26,55]],'#7c7b68');
        for(let i=0;i<25;i++)rect(14+(i*13)%32,31+(i*7)%20,2,1,i%2?'#c1bda5':'#565d50');
      }else if(kind==='flower'){
        for(let i=0;i<5;i++){const x=15+i*8,y=33+(i%2)*9;rect(x,y,2,22-(i%2)*9,'#4b6540');rect(x-2,y,7,3,i%2?'#b1a27b':'#a26053');rect(x,y-3,3,8,i%2?'#dfd0a0':'#d69478');}
      }else if(kind==='ship'||kind==='dock'||kind==='bench'){
        poly([[6,36],[41,22],[61,34],[48,52],[20,56]],'#533c28');poly([[9,35],[41,25],[57,34],[45,47],[22,50]],'#af8a52');
        for(let y=34;y<48;y+=4)line(17,y,48,y-7,'#705334');
        if(kind==='ship'){line(35,30,35,5,'#58432d',2);poly([[37,6],[53,23],[37,27]],'#ded1ae');}
        else{rect(14,43,4,15,'#5a422c');rect(49,35,4,15,'#5a422c');}
      }else if(kind==='gate'||kind==='fence'){
        for(let x=10;x<58;x+=9){rect(x,20,5,35,'#634a2c');rect(x,20,2,35,'#af8d57');}rect(9,29,48,4,'#937247');rect(9,44,48,4,'#937247');
      }else{
        poly([[14,27],[36,17],[53,27],[31,38]],'#ba935b');poly([[14,27],[31,38],[31,57],[14,46]],'#866239');poly([[31,38],[53,27],[53,46],[31,57]],'#694c2e');
        line(16,31,29,40,'#d5b579');line(34,40,51,31,'#b89359');line(21,30,21,49,'#483b28',2);line(44,34,44,50,'#423625',2);
      }
      c.restore();
    }
    return canvas;
  }
  // 입체 건물은 기존 픽셀 라이브러리의 2D 성벽 그림보다 확실한 높이와 형태를 제공한다.
  makeFort3d(kind,height){
    const g=new THREE.Group(),m={
      wall:new THREE.MeshLambertMaterial({color:0xbcb29d}),
      light:new THREE.MeshLambertMaterial({color:0xd2c4a3}),
      stone:new THREE.MeshLambertMaterial({color:0x77766c}),
      wood:new THREE.MeshLambertMaterial({color:0x725037}),
      trim:new THREE.MeshLambertMaterial({color:0xad8753}),
      roof:new THREE.MeshLambertMaterial({color:0x654b43}),
      tile:new THREE.MeshLambertMaterial({color:0x98734e}),
      dark:new THREE.MeshLambertMaterial({color:0x303a34}),
      flag:new THREE.MeshLambertMaterial({color:0xa34538,side:THREE.DoubleSide}),
      earth:new THREE.MeshLambertMaterial({color:0x958262}),
      soil:new THREE.MeshLambertMaterial({color:0x684c33}),
      leaf:new THREE.MeshLambertMaterial({color:0x43844e}),
      crop:new THREE.MeshLambertMaterial({color:0xd9b457}),
      grape:new THREE.MeshLambertMaterial({color:0x643878}),
      metal:new THREE.MeshLambertMaterial({color:0x667b88}),
      fire:new THREE.MeshLambertMaterial({color:0xff9a35,emissive:0x4e1c00}),
      water:new THREE.MeshLambertMaterial({color:0x54a6aa})
    };
    const add=(geo,mat,x,y,z)=>{const item=new THREE.Mesh(geo,m[mat]);item.position.set(x,y,z);g.add(item);return item};
    const box=(w,h,d,mat,x=0,y=0,z=0)=>add(new THREE.BoxGeometry(w,h,d),mat,x,y,z);
    const cyl=(r,h,mat,x=0,y=0,z=0)=>add(new THREE.CylinderGeometry(r,r,h,8),mat,x,y,z);
    const cone=(r,h,mat,x=0,y=0,z=0)=>add(new THREE.ConeGeometry(r,h,7),mat,x,y,z);
    const log=(x,y,z)=>{const p=cyl(.21,1.5,'wood',x,y,z);p.rotation.z=Math.PI/2;};
    const barrel=(x,z)=>{cyl(.34,.74,'wood',x,.38,z);
      cyl(.36,.07,'metal',x,.16,z);cyl(.36,.07,'metal',x,.63,z);};
    const gable=(w,d,y,mat='roof')=>{for(const side of [-1,1]){
      const p=box(w*.59,.16,d+.22,mat,side*w*.264,y,0);p.rotation.z=side*.58;}};
    const hut=(w=3,d=2.5,mat='wall')=>{
      box(w,1.55,d,mat,0,.78,0);gable(w,d,1.88);
      box(.6,1.05,.1,'dark',0,.53,d/2+.04);};
    const crest=(w,d,h)=>{
      for(let x=-w/2+.2;x<w/2;x+=.5)for(const z of [-d/2,d/2])
        box(.31,.34,.28,'light',x,h+.18,z);
      for(let z=-d/2+.2;z<d/2;z+=.5)for(const x of [-w/2,w/2])
        box(.28,.34,.31,'light',x,h+.18,z);
    };
    const banner=(x,y,z)=>{box(.065,1.5,.065,'trim',x,y,z);box(.94,.46,.07,'flag',x+.5,y+.43,z)};
    if(kind==='fort-road'){
      for(let z=-.84;z<=.84;z+=.42)for(let x=-.84;x<=.84;x+=.42)
        box(.38,.065,.38,Math.round((x+z)*100)%3===0?'stone':'wall',x,.035,z);
      return g;
    }
    if(kind==='fort-site'){
      box(3.5,.16,3,'earth',0,.07,0);
      for(let i=0;i<7;i++)box(.46,.22,.4,i%2?'stone':'wall',-1.4+(i%4)*.82,.23,-.95+Math.floor(i/4)*1.8);
      for(const x of [-1.45,1.45])for(const z of [-1.22,1.22])box(.11,.55,.11,'wood',x,.34,z);
      banner(1.35,.95,-1.1);return g;
    }
    if(kind==='fort-wall'||kind==='fort-wall-side'){
      const w=kind==='fort-wall'?3:.78,d=kind==='fort-wall'?.78:3,h=Math.max(1.6,height*.83);
      box(w,h,d,'wall',0,h/2,0);
      box(w+.09,.17,d+.09,'stone',0,h-.08,0);crest(w,d,h);
      return g;
    }
    if(kind==='fort-watchtower'){
      const h=Math.max(3.1,height);
      cyl(.77,h*.84,'wall',0,h*.42,0);cyl(.98,.19,'stone',0,h*.84,0);
      for(let i=0;i<8;i++){const a=i*Math.PI/4;
        const part=box(.34,.37,.3,'light',Math.cos(a)*.84,h*1.01,Math.sin(a)*.84);part.rotation.y=a;
      }
      for(const a of [0,Math.PI/2,Math.PI,3*Math.PI/2]){
        const win=box(.2,.47,.08,'dark',Math.sin(a)*.78,h*.54,Math.cos(a)*.78);
        win.rotation.y=a;
      }
      cyl(.89,.2,'stone',0,.13,0);banner(0,h+1,0);return g;
    }
    if(kind==='fort-gatehouse'){
      const h=Math.max(3.3,height);
      box(3.5,h*.74,1.3,'wall',0,h*.37,0);
      box(1.08,h*.56,.18,'dark',0,h*.28,.72);
      box(.88,h*.54,.12,'wood',0,h*.27,.84);
      for(let x=-.38;x<.4;x+=.19)box(.06,h*.53,.08,'stone',x,h*.28,.94);
      for(const x of [-1.62,1.62]){
        cyl(.82,h*.95,'wall',x,h*.475,0);
        cyl(.98,.15,'stone',x,h*.95,0);
        for(let j=0;j<8;j++){const a=j*Math.PI/4;
          box(.33,.35,.29,'light',x+Math.cos(a)*.83,h+0.1,Math.sin(a)*.83);
        }
        box(.18,.42,.08,'dark',x,h*.6,.84);
      }
      crest(3.5,1.3,h*.75);return g;
    }
    if(kind==='fort-keep'){
      const h=Math.max(5,height);
      box(4.6,h*.62,3.55,'wall',0,h*.31,0);
      box(4.8,.19,3.75,'stone',0,h*.62,0);
      crest(4.6,3.55,h*.63);
      for(const x of [-1.72,1.72])for(const z of [-1.25,1.25]){
        cyl(.64,h*.9,'wall',x,h*.45,z);
        cyl(.78,.14,'stone',x,h*.9,z);
        for(let i=0;i<8;i++){const a=i*Math.PI/4;
          box(.25,.32,.24,'light',x+Math.sin(a)*.7,h*.99,z+Math.cos(a)*.7)}
      }
      box(1.1,h*.35,.15,'dark',0,h*.2,1.83);
      for(const x of [-1,1])box(.27,.59,.12,'dark',x,h*.46,1.82);
      banner(0,h*1.1,0);return g;
    }

    // 역할별 3D 실루엣: 들판, 채굴장, 작업장 장치, 수확물까지 실물로 표시.
    if(kind==='fort-lumber'){
      box(4.6,.12,3.7,'soil',0,.06,0);
      box(2.1,1.26,2.3,'wood',-1,.67,-.65);
      for(const side of [-1,1]){const p=box(.75,.13,2.5,'tile',-1+side*.43,1.51,-.65);p.rotation.z=side*.58;}
      for(let i=0;i<3;i++)for(const z of [-.7,-.2])log(.97,.3+i*.46,z);
      for(let i=0;i<5;i++)box(1.55,.1,.3,'trim',1.1,.18+i*.14,1.12);
      box(.19,1.1,.19,'metal',-1.8,.6,1);return g;
    }
    if(kind==='fort-quarry'){
      box(4.8,.13,4,'soil',0,.06,0);
      cyl(1.25,.17,'stone',-.65,.12,-.36);
      cyl(.99,.11,'dark',-.65,.22,-.36);
      for(const [x,z,r] of [[-1.6,-1.15,.61],[-1.62,1,.6],[.5,-1.55,.46],[1.57,.8,.69]]){
        const b=add(new THREE.DodecahedronGeometry(r,0),'stone',x,r*.55,z);b.rotation.y=x;}
      box(.17,2.45,.17,'wood',1.44,1.28,-.8);box(2,.18,.18,'wood',.5,2.38,-.8);
      box(.08,1.2,.09,'metal',-.44,1.77,-.8);box(.71,.4,.67,'stone',-.44,.98,-.8);return g;
    }
    if(kind==='fort-iron'){
      box(3.6,2.4,2.2,'stone',-.4,1.2,-.55);
      box(1.54,1.55,.14,'dark',-.35,.8,.61);
      for(const x of [-1.13,.42])box(.2,1.7,.19,'wood',x,.87,.72);
      box(1.78,.2,.22,'wood',-.35,1.75,.72);
      for(let i=0;i<6;i++)box(.5,.29,.43,'metal',.46+(i%3)*.51,
        .27+Math.floor(i/3)*.28,1.52);return g;
    }
    if(['fort-wheat','fort-vineyard','fort-hops','fort-orchard'].includes(kind)){
      box(4.7,.12,3.92,'soil',0,.06,0);
      if(kind==='fort-wheat'){
        for(let r=0;r<4;r++){const z=-1.28+r*.85;
          box(4.32,.15,.47,'earth',0,.19,z);
          for(let i=0;i<6;i++){const x=-1.83+i*.73;
            box(.09,.67,.09,'leaf',x,.58,z);cone(.19,.48,'crop',x,1.12,z);}}
      }else if(kind==='fort-vineyard'){
        for(const z of [-1.17,0,1.17]){
          for(const x of [-1.8,0,1.8])box(.11,1.7,.11,'wood',x,.89,z);
          box(3.6,.1,.12,'wood',0,1.55,z);
          for(const x of [-1.2,0,1.2]){
            box(.99,.35,.48,'leaf',x,1.39,z);
            for(const side of [-1,1])cyl(.16,.36,'grape',x+side*.3,1.05,z+.14);}}
      }else if(kind==='fort-hops'){
        for(const x of [-1.53,-.52,.5,1.5]){
          for(const z of [-1.25,1.25])box(.1,2.73,.1,'wood',x,1.41,z);
          for(let i=0;i<5;i++){
            box(.35,.34,.35,'leaf',x,.5+i*.45,0);
            box(.2,.19,.21,'crop',x,.61+i*.43,.28);}}
        box(3.9,.12,.13,'wood',0,2.74,0);
      }else{
        for(const [x,z] of [[-1.37,-1],[1.37,-1],[-1.37,1],[1.37,1]]){
          cyl(.16,1.18,'wood',x,.63,z);
          add(new THREE.IcosahedronGeometry(.73,0),'leaf',x,1.49,z);
          box(.2,.19,.2,'flag',x+.4,1.38,z+.2);}
        box(1,.65,.78,'wood',0,.34,0);
      }
      return g;
    }
    if(kind==='fort-mill'){
      cyl(1.18,3.65,'wall',0,1.84,0);cone(1.48,1.38,'roof',0,4.3,0);
      for(let i=0;i<4;i++){const a=i*Math.PI/2;
        const blade=box(.34,1.55,.14,'light',Math.cos(a)*.93,
          2.68+Math.sin(a)*.93,1.29);blade.rotation.z=-a;}
      cyl(.26,.4,'wood',0,2.68,1.3).rotation.x=Math.PI/2;
      box(.65,1.15,.11,'dark',0,.62,1.16);return g;
    }
    if(kind==='fort-granary'){
      cyl(1.2,2.95,'wood',0,1.5,-.3);cone(1.65,1.53,'tile',0,3.63,-.3);
      for(let i=0;i<5;i++)box(.75,.46,.6,'crop',-1.25+(i%2)*.85,
        .32+Math.floor(i/2)*.41,1.34);return g;
    }
    if(kind==='fort-stockpile'){
      box(4.8,.12,3.9,'earth',0,.06,0);
      for(const x of [-1.78,1.78])for(const z of [-1.28,1.28])
        box(.15,2.12,.15,'wood',x,1.1,z);
      gable(4.12,3.08,2.22,'tile');
      for(let i=0;i<4;i++)log(-1,.31+i*.36,.3);
      for(let i=0;i<5;i++)box(.76,.49,.52,'stone',
        .41+(i%2)*.79,.3+Math.floor(i/2)*.44,.72);return g;
    }
    if(kind==='fort-well'){
      cyl(1.05,.95,'stone',0,.5,0);cyl(.79,.95,'water',0,.52,0);
      for(const x of [-1.17,1.17])box(.15,2.13,.15,'wood',x,1.1,0);
      box(2.5,.16,.21,'wood',0,2.19,0);
      cyl(.22,.46,'metal',0,1.44,0);return g;
    }
    if(kind==='fort-smith'){
      box(3.45,1.54,2.51,'stone',-.25,.79,-.35);gable(3.75,2.7,1.9);
      box(.72,2.67,.73,'stone',1.11,2.33,-.9);
      box(1.35,.91,1.04,'dark',1.12,.49,1.44);
      box(.9,.52,.15,'fire',1.12,.59,1.98);
      box(.98,.25,.49,'metal',-1.04,1.03,1.52);
      box(.35,.99,.3,'metal',-1.04,.51,1.52);return g;
    }
    if(['fort-winery','fort-brewery','fort-bakery','fort-dairy',
        'fort-tavern','fort-fletcher'].includes(kind)){
      hut(kind==='fort-tavern'?3.9:3.4,2.55,
        kind==='fort-brewery'?'stone':kind==='fort-dairy'?'wood':'wall');
      if(kind==='fort-winery'){
        for(const x of [-1.45,-.5,.44])barrel(x,1.75);
        cyl(.83,.31,'wood',1.31,.51,1.46);
        box(.91,.24,.8,'grape',1.31,.81,1.46);
        box(.14,1.42,.14,'wood',1.31,1.4,1.46);
      }else if(kind==='fort-brewery'){
        for(const x of [-1.4,-.56,.28])barrel(x,1.73);
        cyl(.74,1.12,'metal',1.25,.67,1.39);
        box(.83,.2,.75,'fire',1.25,.17,1.39);
        box(.58,2,.54,'stone',1.05,2.37,-.73);
      }else if(kind==='fort-bakery'){
        box(1.34,1.05,1.11,'stone',1.46,.53,1.35);
        box(.88,.44,.13,'fire',1.46,.48,1.97);
        box(.55,2.17,.55,'stone',.9,2.3,-.72);
        for(let i=0;i<3;i++)box(.42,.15,.28,'crop',-.95+i*.46,.42,1.54);
      }else if(kind==='fort-dairy'){
        box(1.28,.81,.66,'light',1.15,.75,1.91);
        box(.49,.55,.51,'light',1.72,.77,1.95);
        for(const x of [.71,1.48])for(const z of [1.63,2.15])
          box(.17,.51,.19,'dark',x,.3,z);
        for(let i=0;i<3;i++)cyl(.18,.27,'light',-.94+i*.32,.14,1.49);
      }else if(kind==='fort-tavern'){
        box(3.7,.14,1.46,'flag',0,1.84,2.07);
        for(const x of [-1.51,1.51])box(.12,1.75,.12,'wood',x,.91,2.7);
        for(const x of [-1.2,0,1.2])barrel(x,1.58);
      }else{
        for(let i=0;i<7;i++)box(.07,1.42,.08,'wood',
          -1.5+i*.18,.85,1.56);
        cyl(.62,.12,'crop',1.31,1.14,1.67).rotation.x=Math.PI/2;
        cyl(.39,.13,'flag',1.31,1.14,1.79).rotation.x=Math.PI/2;
        box(.14,1.89,.16,'wood',1.31,.97,1.51);
      }
      return g;
    }
    if(kind==='fort-hovel'){
      box(2.5,1.45,2.2,'wood',0,.74,0);gable(2.9,2.4,1.85,'crop');
      box(.59,1,.11,'dark',0,.51,1.16);
      box(1.17,.58,.66,'wood',1.14,.31,-.73);return g;
    }
    if(kind==='fort-armory'){
      box(4.1,2.35,3.0,'stone',0,1.18,0);gable(4.3,3.2,2.66);
      box(.8,1.5,.1,'metal',0,.8,1.54);
      for(const x of [-1.54,1.54]){
        cyl(.43,.17,'metal',x,1.47,1.57).rotation.x=Math.PI/2;
        for(let i=0;i<3;i++)box(.1,2.3,.1,'metal',
          x+(i-1)*.3,1.32,1.9);}
      banner(1.65,3.25,-1);return g;
    }
    const h=Math.max(2.3,height*.74);
    const w=kind==='fort-barracks'?4.6:kind==='fort-market'?3.9:kind==='fort-workshop'?3.5:2.8;
    const d=kind==='fort-barracks'?3.1:2.75;
    box(w,h*.68,d,kind==='fort-workshop'?'stone':'wall',0,h*.34,0);
    for(const sign of [-1,1]){
      const slab=box(w*.59,.18,d+.28,kind==='fort-barracks'?'roof':'tile',sign*w*.265,h*.84,0);
      slab.rotation.z=sign*.57;
    }
    for(const x of [-w*.42,w*.42])box(.16,h*.68,.16,'wood',x,h*.34,d/2+.05);
    box(.57,.95,.08,'dark',0,.5,d/2+.06);
    for(const x of [-w*.29,w*.29]){
      box(.45,.5,.07,'dark',x,h*.43,d/2+.1);
      box(.07,.5,.08,'trim',x,h*.43,d/2+.13);
      box(.45,.07,.08,'trim',x,h*.43,d/2+.13);
    }
    if(kind==='fort-barracks'){
      banner(w*.34,h+.5,-d*.28);
      for(let i=0;i<3;i++)box(.26,.72,.2,'wood',-w*.38+i*.42,.46,-d/2-.1);
      // 훈련장·대련 허수아비·깃발·검걸이.
      box(4.5,.13,1.84,'earth',0,.06,d/2+1.03);
      for(const x of [-1.35,.15]){
        box(.15,1.6,.16,'wood',x,.82,d/2+1.08);
        box(.95,.15,.13,'wood',x,1.18,d/2+1.08);
        cyl(.25,.42,'crop',x,1.74,d/2+1.08);}
      banner(1.83,2.6,d/2+.56);
      for(let i=0;i<4;i++)box(.09,1.42,.09,'metal',
        1.13+i*.21,.79,d/2+1.49);
    }
    if(kind==='fort-market')for(const x of [-1.35,0,1.35]){
      box(1.15,.12,1.18,'tile',x,1.45,d/2+.9);
      box(.99,.6,.5,'trim',x,.35,d/2+.86);
      for(const px of [x-.48,x+.48])box(.07,1.35,.07,'wood',px,.72,d/2+.86);
    }
    if(kind==='fort-workshop'){
      box(.36,1.7,.4,'stone',w*.3,h*.9,-d*.2);
      box(.46,.17,.46,'wall',w*.3,h*1.71,-d*.2);
    }
    return g;
  }
  make3d(kind,height){
    if(['fort-cottage','fort-barracks','fort-workshop','fort-market','fort-keep','fort-watchtower','fort-gatehouse','fort-wall','fort-wall-side','fort-road','fort-site',...Object.values(ECONOMY_3D_LOOK)].includes(kind))return this.makeFort3d(kind,height);
    const group=new THREE.Group(),asset=this.models3d.get(kind);
    if(!asset)return group;
    const texture=asset.texture.clone();texture.needsUpdate=true;
    const image=texture.image;
    let width=image.width,heightPx=image.height;
    if(asset.frames){
      width/=asset.columns;heightPx/=asset.rows;
      texture.repeat.set(1/asset.columns,1/asset.rows);
      texture.offset.set(1/asset.columns,1-((asset.row||0)+1)/asset.rows);
    }else if(asset.bounds){
      const [x,y,w,h]=asset.bounds;width=w;heightPx=h;
      texture.repeat.set(w/image.width,h/image.height);
      texture.offset.set(x/image.width,1-(y+h)/image.height);
    }
    if(kind==='fort-road'){
      const road=new THREE.Mesh(new THREE.PlaneGeometry(2.1,2.1),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false}));
      road.rotation.x=-Math.PI/2;road.position.y=.025;group.add(road);
    }else{
      const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,alphaTest:.07,depthWrite:false}));
      const visualHeight=kind==='fort-wall'||kind==='fort-wall-side'?height*1.3:height;
      sprite.center.set(.5,0);sprite.scale.set(visualHeight*width/heightPx,visualHeight,1);group.add(sprite);
    }
    return group;
  }
  release3d(item){
    this.scene3.remove(item.mesh);
    item.mesh.traverse(part=>{
      if(part.material){part.material.map?.dispose();part.material.dispose();}
      if(part.isMesh)part.geometry.dispose();
    });
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
        if(kind==='fort-wall'&&Math.abs(Math.sin(rotation))>.5)kind='fort-wall-side';
        visibleIds.add(id);
        const loaded=this.models3d.has(kind);
        let item=this.instances3d.get(id);
        if(item&&(item.kind!==kind||item.loaded!==loaded||item.height!==height)){
          this.release3d(item);this.instances3d.delete(id);item=null;
        }
        if(!item){const mesh=this.make3d(kind,height);
          this.scene3.add(mesh);item={mesh,kind,loaded,height};this.instances3d.set(id,item)}
        const asset=this.models3d.get(kind),sprite=item.mesh.children[0];
        if(asset?.frames&&sprite?.material?.map){
          const dx=x-(item.lastX??x),dy=y-(item.lastY??y);
          if(Math.hypot(dx,dy)>.05){
            item.movedAt=now;
            const sx=dx-dy,sy=(dx+dy)*.5;
            item.direction=Math.abs(sx)>Math.abs(sy)?sx>0?3:1:sy>0?0:2;
          }
          const frame=now-(item.movedAt??-Infinity)<180?Math.floor(now/145)%asset.frames:1;
          const column=(item.direction||0)*asset.frames+frame;
          sprite.material.map.offset.set(column/asset.columns,1-((asset.row||0)+1)/asset.rows);
        }
        item.lastX=x;item.lastY=y;
        item.mesh.position.set(x*SC,.03,y*SC);
        item.mesh.rotation.y=kind==='fort-wall-side'?0:rotation;
      };
      this.east3.visible=this.eastGrass3.visible=!!game.state.expanded;
      // 외곽 사막은 기본적으로 보여 주되 기존 유료 확장 지역의 해금 판정은 유지한다.
      this.frontier3.visible=this.frontierGrass3.visible=true;
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
      // 기본 영지: 실제 건설 진행과 무관한 민가·도로·시장이 마을 규모를 드러낸다.
      put('home','fort-cottage',765,350,4.8);
      put('hamlet-north','fort-cottage',525,335,3.35);
      put('hamlet-east','fort-cottage',1050,380,3.15);
      put('hamlet-south','fort-cottage',1145,800,3.25);
      put('hamlet-west','fort-cottage',440,680,3.15);
      put('hamlet-crossroad','fort-market',715,660,2.5);
      for(let i=0;i<11;i++)put('village-street:'+i,'fort-road',730,255+i*59,.06);
      for(let i=0;i<6;i++)put('village-link:'+i,'fort-road',530+i*57,630,.06);
      for(let i=0;i<6;i++)put('farm-street:'+i,'fort-road',970+i*49,730,.06);
      for(let i=0;i<8;i++)put('palisade-n:'+i,'fence',180+i*147,145,1.1);
      put('market','fort-market',game.workerShop.x,game.workerShop.y,3.0);
      const production=game.state.productionBuildings||{},village=game.state.villageDevelopment||{};
      put('lumber',production.lumberBuilt?'fort-lumber':'package',245,850,production.lumberBuilt?2.9:1.0);
      put('mine',production.mineBuilt?'fort-quarry':'stone',785,965,production.mineBuilt?2.9:1.2);
      const fort=village.fortification||{},walls=fort.walls||{};
      if(this.moat3)this.moat3.visible=!!village.townHallBuilt&&!!fort.moatBuilt;
      if(village.townHallBuilt&&fort.moatBuilt){
        if(fort.drawbridgeClosed!==false)put('fort-raised-bridge','gate',1400,608,2.7,Math.PI/2);
        else put('fort-lowered-bridge','bench',1430,608,1.4,Math.PI/2);
      }
      const tier=Math.max(1,Math.min(3,Number(fort.wallTier)||1));
      const wallHeight=2+(tier-1)*.65,gateHeight=3.25+(tier-1)*.38;
      if(!village.defenseTowerBuilt)put('tower-site','fort-site',400,1090,.18);
      if(!village.townHallBuilt)put('hall-site','fort-site',1010,1090,.18);
      if(!production.lumberBuilt)put('lumber-site','fort-site',245,850,.18);
      if(!production.mineBuilt)put('mine-site','fort-site',785,965,.18);
      if(!game.state.barracksBuilt)put('barracks-site','fort-site',game.barracks.x,game.barracks.y,.18);
      if(village.defenseTowerBuilt)put('defense-tower','fort-watchtower',400,1090,3.9+(Math.max(1,Number(village.defenseTowerLevel)||1)-1)*.6);
      if(village.townHallBuilt&&!game.state.keepDestroyed)put('townhall','fort-keep',1010,1090,5.4+
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
        // 오두막·창고는 저장된 경제 건물 위치를 단일 출처로 렌더링한다.
      }
      if(village.defenseTowerBuilt&&village.townHallBuilt){
        if((walls.north??1)>0)put('fort-corner-nw','fort-watchtower',250,210,3.8+(tier-1)*.5);
        if((walls.north??1)>0)put('fort-corner-ne','fort-watchtower',1310,210,3.8+(tier-1)*.5);
      }
      // 성곽 안 길은 시각 요소뿐이며 기존 이동·상호작용 좌표는 그대로 사용.
      for(let i=0;i<7;i++)put('fort-road:'+i,'fort-road',755,465+i*72,.05);
      if(game.state.seedDepot?.built)put('seed-depot','package',835,505,1.3);
      if(game.state.smithy)put('smithy','fort-smith',790,1080,2.1);
      if(game.state.darknessFlameV19?.blackMineBuilt)put('black-mine','house',-880,690,3.6);
      if(game.state.abyssCaveV23?.researchLabBuilt)put('research-lab','house',-690,420,4);
      put('barracks',game.state.barracksBuilt?'fort-barracks':'package',
        game.barracks.x,game.barracks.y,3);
      // 실제 건설된 석벽/성문/망루/함정은 저장된 위치와 손상 체력으로 렌더링한다.
      for(let i=0;i<(fort.structures?.length||0);i++){
        const section=fort.structures[i];if(section.hp<=0)continue;
        const look={wall:'fort-wall',gate:'fort-gatehouse',tower:'fort-watchtower',
          spikes:'fence',oil:'package',pit:'stone',net:'fence',log:'bench',barrel:'package'}[section.kind]||'fort-site';
        const vertical=section.axis==='vertical'||section.axis==='manual-vertical';
        put('custom-fort:'+i,look,section.x,section.y,
          section.kind==='tower'?4:section.kind==='gate'?3.6:section.kind==='wall'?2.5:1.1,
          vertical?Math.PI/2:0);
      }
      // 소유한 경제 건물: 실제 건설 위치와 레벨에 맞춰 입체 중세 건물을 렌더링한다.
      const economy=game.state.economyV4?.buildings||{};
      for(const [id,entry] of Object.entries(economy)){
        const slots=Array.isArray(entry?.sites)?entry.sites:[];
        for(let i=0;i<Math.min(slots.length,entry.count||0);i++){
          // 기존 마을 작업장 첫 위치는 원래 렌더가 책임지므로 중복 표시하지 않는다.
          if(i===0&&['lumber','quarry'].includes(id))continue;
          const slot=slots[i],kind=ECONOMY_3D_LOOK[id]||'fort-workshop';
          put('economic:'+id+':'+i,kind,slot.x,slot.y,
            (kind==='fort-keep'?4:kind==='fort-market'?2.85:3.05)+(Math.max(1,entry.level||1)-1)*.55);
        }
      }
      if(game.buildingPlacement?.at){
        const build=game.buildingPlacement;
        const previews=build.id==='fort:wall'?(build.preview?.length?build.preview:[build.at]):[build.at];
        const kind=build.id.startsWith('fort:')?({
           wall:'fort-wall',gate:'fort-gatehouse',tower:'fort-watchtower',
           spikes:'fence',oil:'package',pit:'stone',net:'fence',log:'bench',barrel:'package'
         }[build.id.slice(5)]||'fort-site'):(ECONOMY_3D_LOOK[build.id]||'fort-site');
        for(let i=0;i<Math.min(35,previews.length);i++){
          const p=previews[i],vertical=build.id==='fort:gate'&&build.axis==='vertical';
          const key='construction-preview:'+i;
          put(key,kind,p.x,p.y,kind==='fort-gatehouse'?3.6:kind==='fort-wall'?2.5:3.05,
              vertical?Math.PI/2:0);
          const ghost=this.instances3d.get(key);
          if(ghost){
            if(!ghost.previewReady){
              ghost.mesh.traverse(part=>{
                if(!part.isMesh)return;
                part.material=part.material.clone();
                part.material.transparent=true;part.material.opacity=.52;part.material.depthWrite=false;
              });
              ghost.previewReady=true;
            }
            if(ghost.valid!==!!build.previewValid){
              ghost.valid=!!build.previewValid;
              ghost.mesh.traverse(part=>{
                if(part.isMesh&&part.material?.color)part.material.color.setHex(
                  build.previewValid===false?0xc96460:0x83c596);
              });
            }
          }
        }
      }
      // 적 영주는 자기 마을회관·성벽·탑·주민 건물이 있는 독립 요새를 가진다.
      // 성과 성 사이: 왕국별로 숲·암석·설산·국경길이 실제 화면에 나타난다.
      const clusters=[
        {x:-1250,y:-650,kind:'tree',n:20,dx:135,dy:95},
        {x:2090,y:-1310,kind:'tree',n:18,dx:150,dy:125},
        {x:3470,y:1450,kind:'stone',n:19,dx:120,dy:130},
        {x:4620,y:-3560,kind:'stone',n:26,dx:142,dy:128},
        {x:-3300,y:-3180,kind:'tree',n:13,dx:154,dy:165}
      ];
      for(const area of clusters)for(let i=0;i<area.n;i++){
        const x=area.x+(i%7)*area.dx+(i%2)*24;
        const y=area.y+Math.floor(i/7)*area.dy+((i*17)%33);
        put('realm-biome:'+area.kind+':'+area.x+':'+i,area.kind,x,y,area.kind==='tree'?2.8+(i%4)*.35:.95+(i%3)*.27);
      }
      for(const lord of game.state.enemyLordsV5||[]){
        const id='enemy-stronghold:'+lord.id,x=lord.x,y=lord.y;
        if(!lord.defeated)put(id+':keep','fort-keep',x,y,5.25+(lord.focus==='defense'?.65:0));
        else put(id+':ruins','stone',x,y,2.6);
        if(!lord.defeated&&lord.wallHp>0){
          for(let i=-3;i<=3;i++){
            put(id+':north:'+i,'fort-wall',x+i*100,y-245,2.65);
            put(id+':south:'+i,'fort-wall',x+i*100,y+225,2.65);
          }
          for(let i=-2;i<=2;i++){
            put(id+':east:'+i,'fort-wall',x+345,y+i*90,2.65,Math.PI/2);
            put(id+':west:'+i,'fort-wall',x-345,y+i*90,2.65,Math.PI/2);
          }
          put(id+':gate','fort-gatehouse',x-345,y,4);
        }
        for(const dx of [-350,350])for(const dy of [-245,225]){
          if(!lord.defeated&&lord.wallHp>0)put(id+':tower:'+dx+':'+dy,'fort-watchtower',x+dx,y+dy,4.25);
        }
        for(let i=0;i<Math.min(8,lord.buildings||4);i++){
          const rx=x-245+(i%4)*160,ry=y-130+Math.floor(i/4)*190;
          if(Math.hypot(rx-x,ry-y)<120)continue;
          put(id+':village:'+i,i%4===0?'fort-market':'fort-cottage',rx,ry,2.9);
        }
        for(let i=0;i<4;i++)put(id+':road:'+i,'fort-road',x-160+i*105,y+100,.07);
      }
      for(const enemy of game.fieldEnemies||[])if(enemy.hp>0)
        put('enemy-garrison:'+enemy.id,enemy.kind==='archer'?'soldier':'enemy',enemy.x,enemy.y,1.95);
      put('ship','ship',775,760,1.4);put('fishing','dock',520,430,1.4);
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
      // 인부는 더 이상 성문 앞에서 제자리 회전하지 않는다.
      // 실제 창고↔생산시설 최단 경로를 왕복하며 닫힌 성문·성벽을 우회한다.
      const economyJobs=game.state.economyV4?.buildings||{};
      const destinations=[
        ...Object.entries(economyJobs)
         .filter(([id,b])=>b?.count>0&&!['stockpile','granary','hovel','well','market','armory'].includes(id))
         .flatMap(([id,b])=>(b?.sites||[]).slice(0,b.count).map(p=>({id,x:p.x,y:p.y})))
      ];
      const workerCount=Math.min(12,destinations.length*2);
      const wallMap=(fort.structures||[]).filter(w=>w.hp>0&&['wall','gate','tower'].includes(w.kind));
      const signature=wallMap.map(w=>w.kind+':'+w.x+':'+w.y+':'+w.open).join('|');
      if(!this.workerPathCache||this.workerPathCache.signature!==signature){
        this.workerPathCache={signature,routes:new Map()};
      }
      for(let i=0;i<workerCount;i++){
        const dest=destinations[i%destinations.length],routeKey=dest.id+':'+dest.x+':'+dest.y;
        let path=this.workerPathCache.routes.get(routeKey);
        if(!path){
          path=findWorkerRoute({x:390,y:820},dest,wallMap);
          this.workerPathCache.routes.set(routeKey,path);
        }
        if(path.length<2)continue;
        const lengths=[0];
        for(let p=1;p<path.length;p++)lengths.push(lengths[p-1]+Math.hypot(
          path[p].x-path[p-1].x,path[p].y-path[p-1].y));
        const total=lengths[lengths.length-1];
        if(total<=0)continue;
        const travel=((game.timeNow/1000+i*7)*78)%(total*2);
        const current=travel>total?2*total-travel:travel;
        let j=1;while(j<lengths.length-1&&lengths[j]<current)j++;
        const delta=Math.max(1,lengths[j]-lengths[j-1]);
        const f=(current-lengths[j-1])/delta;
        const x=path[j-1].x+(path[j].x-path[j-1].x)*f;
        const y=path[j-1].y+(path[j].y-path[j-1].y)*f;
        put('economic-worker:'+i,'npc',x,y,1.75);
        if(i%3===0)put('worker-wagon:'+i,'package',x+14,y+16,.83);
      }
      // 신규 병과/공성기: 기존 메시에 연계, 모바일에서 카메라 밖 메시 생성 최소화.
      const friendlyBudget=this.width<600?65:110;
      for(const unit of game.allies.filter(u=>u.hp>0&&nearby(u.x,u.y)).slice(0,friendlyBudget)){
        const kind=unit.kind==='ram'?'fort-ram':
          unit.kind==='trebuchet'?'fort-trebuchet':
          unit.kind==='siegeTower'?'fort-siege-tower':
          unit.kind==='knight'?'hero':
          ['crossbow','sapper'].includes(unit.kind)?'npc':'soldier';
        put('ally:'+unit.id,kind,unit.x,unit.y,
          unit.kind==='siegeTower'?4.7:unit.kind==='trebuchet'?3.5:unit.kind==='ram'?3.3:1.9);
      }
      // 메인: 픽셀 프레임 공유로 병력 표시 비용을 줄인다. 전투 판정은 기존 게임 책임이다.
      const modelBudget=this.width<600?96:192;
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
      // 스트롱홀드식 전략게임: 내부 호환용 좌표는 유지하지만 플레이어 아바타는 렌더링하지 않는다.
      for(const [id,item] of this.instances3d)if(!visibleIds.has(id)){
        this.release3d(item);this.instances3d.delete(id);
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
      this.pixelScale=this.width<600?1.25:1;
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
  defaultStrategyZoom(){return this.width<600?.6:.88}
  panCamera(dx,dy){
    const zoom=this.viewZoom??this.defaultStrategyZoom();
    const x=(Math.cos(ISO_YAW)*dx+Math.sin(ISO_YAW)*dy/Math.sin(ISO_PITCH))/zoom;
    const y=(-Math.sin(ISO_YAW)*dx+Math.cos(ISO_YAW)*dy/Math.sin(ISO_PITCH))/zoom;
    this.viewFocus.x=Math.max(-4200,Math.min(6500,this.viewFocus.x-x));
    this.viewFocus.y=Math.max(-4450,Math.min(3400,this.viewFocus.y-y));
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

