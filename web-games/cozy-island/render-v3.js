// 파일명: web-games/cozy-island/render-v3.js
// 임포트: 기존 월드 좌표·깊이 정렬은 유지하고 새 중세 픽셀 아트를 연결한다.
import * as THREE from '../../assets/roblox/world-ghosts/native/mesh/three/three.module.js';
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
        const mesh=new THREE.Mesh(geometry,new THREE.MeshLambertMaterial({color,map}));
        mesh.rotation.x=-Math.PI/2;
        mesh.position.set(x*SC,elevation+.225,y*SC);this.scene3.add(mesh);return mesh;
      };
      // 넓어진 전략 전장: 중앙 성곽과 외곽 사막은 같은 3D 지형으로 이어진다.
      ground(9500,5300,2400,900,0x68979b,-1.35);
      this.frontier3=ground(4200,2100,3150,460,0xd0aa77,-.78);
      this.frontierGrass3=ground(3400,1650,3220,420,0xa9986a,-.73);
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
    const terrain={grass:'newgrass.png',sand:'dirt.png',road:'marblepath.png'}[kind];
    if(terrain){
      const texture=new THREE.TextureLoader().load(new URL('../../assets/shared/medieval/'+terrain,import.meta.url).href);
      texture.magFilter=texture.minFilter=THREE.NearestFilter;
      texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.generateMipmaps=false;
      texture.colorSpace=THREE.SRGBColorSpace;this.pixelTextures.set(kind,texture);return texture;
    }
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
  make3d(kind,height){
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
        item.mesh.rotation.y=0;
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
      if(village.defenseTowerBuilt)put('defense-tower','fort-watchtower',400,1090,3.9+(Math.max(1,Number(village.defenseTowerLevel)||1)-1)*.6);
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
      if(game.state.smithy)put('smithy','fort-workshop',790,1080,2.1);
      if(game.state.darknessFlameV19?.blackMineBuilt)put('black-mine','house',-880,690,3.6);
      if(game.state.abyssCaveV23?.researchLabBuilt)put('research-lab','house',-690,420,4);
      put('barracks',game.state.barracksBuilt?'fort-barracks':'package',
        game.barracks.x,game.barracks.y,3);
      // 외곽 거점의 위치를 전장에서 확인할 수 있게 기존 중세 모델을 재사용한다.
      for(let i=0;i<4;i++){
        put('frontier-watch:'+i,'fort-watchtower',2520+i*580,215+(i%2)*640,3.3);
        put('frontier-camp:'+i,'fort-cottage',2800+i*535,490+(i%2)*480,2.8);
      }
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
      for(let i=0;i<game.state.workers;i++){
        const phase=game.timeNow/1000+i*1.7;
        put('worker:'+i,'npc',1020+Math.cos(phase)*50+i*12,505+Math.sin(phase)*25,1.8);
      }
      for(const unit of game.allies)if(unit.hp>0)put('ally:'+unit.id,
        unit.kind==='knight'?'hero':'soldier',unit.x,unit.y,1.9);
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
      this.pixelScale=1;
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
  defaultStrategyZoom(){return Math.max(.3,Math.min(.7,this.width/1150,this.height/1100))}
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

