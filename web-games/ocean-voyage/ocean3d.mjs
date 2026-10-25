// 파일명: ocean3d.mjs · 항해 해도·항구·시설과 실제 GLB 해상 전투 렌더러
// 임포트: 실제 해안선과 게임 규칙 공유. 저장·경제 규칙은 엔진이 담당한다.
import {PORTS,SHIP_TYPES,PORT_SCENES,MERCHANT_CAPTAINS,merchantPosition,portStatus,SITES,CREW,windAt} from './engine.mjs';
import {COUNTRIES} from './assets/countries.mjs';
import {LAND} from './assets/world.mjs';
const HARBOR_VIEWS=[[0,0,1,1],[0,0,.96,.90],[.03,0,.94,.94],[0,.025,1,.88],[.02,.015,.96,.93],[.01,0,.98,.96]];
const C={sea:'#22566c',deep:'#173e55',shore:'#dbc899',land:'#768564',dark:'#283f3c',gold:'#f0d398',wood:'#583c30',roof:'#954f42'};
export function drawGeography(ctx,w,h,cx,cz,scale,style='sea'){
 const parchment=style==='chart';
 const base=ctx.createLinearGradient(0,0,0,h);
 if(parchment){base.addColorStop(0,'#e8d9b8');base.addColorStop(.56,'#d9c7a5');base.addColorStop(1,'#bda581');}
 else{base.addColorStop(0,'#2c7181');base.addColorStop(.48,'#236077');base.addColorStop(1,'#173d58');}
 ctx.fillStyle=base;ctx.fillRect(0,0,w,h);
 const left=cx-w/(2*scale),right=cx+w/(2*scale),top=cz-h/(2*scale),bottom=cz+h/(2*scale);
 ctx.save();ctx.translate(w/2-cx*scale,h/2-cz*scale);ctx.scale(scale,scale);
 // 실제 해도 좌표와 결합된 위·경도 격자: 지도 이동 시 흔들리지 않고 항로 눈금을 유지한다.
 const grid=parchment?40:32;
 ctx.beginPath();for(let x=Math.ceil(left/grid)*grid;x<=right;x+=grid){ctx.moveTo(x,top);ctx.lineTo(x,bottom);}
 for(let z=Math.ceil(top/grid)*grid;z<=bottom;z+=grid){ctx.moveTo(left,z);ctx.lineTo(right,z);}
 ctx.strokeStyle=parchment?'#715e4440':'#bad3c326';ctx.lineWidth=.8/scale;ctx.stroke();
 // 수심 소용돌이·해풍 선은 지리 좌표를 기준으로 결정적 배치한다.
 if(scale>=.5){const stride=parchment?32:26;ctx.lineWidth=(parchment?.75:1)/scale;
  for(let ix=Math.floor(left/stride);ix<=Math.ceil(right/stride);ix++)for(let iz=Math.floor(top/stride);iz<=Math.ceil(bottom/stride);iz++){
   const seed=(ix*173+iz*109+ix*iz*7)>>>0;if(seed%5>1)continue;
   const px=ix*stride+((seed*17)%19),pz=iz*stride+((seed*11)%17);
   const rr=3/scale+(seed%4)*1.8/scale;ctx.beginPath();ctx.ellipse(px,pz,rr*2,rr*.4,seed%3*.35,0,Math.PI*1.5);
   ctx.strokeStyle=parchment?'#83694e42':'#b8ecdd44';ctx.stroke();
  }
 }
 // 자연 해안 폴리곤의 원지형 보존 + 얕은 물띠 + 밝은 포말 + 육지 음영의 삼중 윤곽.
 for(const ring of LAND){
  if(ring.box[2]<left||ring.box[0]>right||ring.box[3]<top||ring.box[1]>bottom)continue;
  ctx.beginPath();ring.points.forEach(([x,z],i)=>i?ctx.lineTo(x,z):ctx.moveTo(x,z));ctx.closePath();ctx.lineJoin='round';
  ctx.lineWidth=(parchment?11:12)/scale;ctx.strokeStyle=parchment?'#ae916744':'#79b7b465';ctx.stroke();
  ctx.lineWidth=12/scale;ctx.strokeStyle=parchment?'#cfb78d':'#82b5b0';ctx.stroke();
  ctx.fillStyle=parchment?'#ac9f77':'#748866';ctx.fill();
  ctx.lineWidth=12;ctx.strokeStyle=parchment?'#d9c7a5':'#236077';ctx.stroke();
  if(scale>1.1){ctx.save();ctx.clip();ctx.strokeStyle=parchment?'#665a3752':'#c9d4a32b';ctx.lineWidth=.7/scale;
   const span=9/scale;ctx.beginPath();
   for(let z=Math.ceil(top/span)*span;z<bottom;z+=span){ctx.moveTo(left,z);ctx.lineTo(right,z-9/scale);}
   ctx.stroke();ctx.restore();
  }
 }
 ctx.strokeStyle=parchment?'#77624955':'#b8d7a05a';ctx.lineWidth=.8/scale;ctx.setLineDash([2/scale,3/scale]);
 for(const country of COUNTRIES)for(const ring of country.rings){ctx.beginPath();ring.forEach(([x,z],i)=>i?ctx.lineTo(x,z):ctx.moveTo(x,z));ctx.stroke();}
 ctx.setLineDash([]);ctx.restore();
 if(scale>.5){ctx.save();ctx.font='bold '+(w<200?7:11)+'px Georgia,serif';ctx.textAlign='center';
  for(const country of COUNTRIES){const x=w/2+(country.lon-cx)*scale,y=h/2+(country.z-cz)*scale;
   if(x>15&&x<w-15&&y>25&&y<h-25){ctx.strokeStyle=parchment?'#dfd2b1b0':'#1c3d4666';ctx.lineWidth=2;ctx.strokeText(country.name,x,y);ctx.fillStyle=parchment?'#584a35':'#efe0b5';ctx.fillText(country.name,x,y);}
  }ctx.restore();
 }
}
export function drawFog(ctx,w,h,cx,cz,scale,charted,style='sea'){
 const known=new Set(charted),left=cx-w/2/scale,top=cz-h/2/scale;
 ctx.fillStyle=style==='chart'?'#4e4336e6':'#071a2de0';ctx.beginPath();
 for(let gx=Math.floor(left/24);gx<Math.ceil((left+w/scale)/24);gx++)for(let gz=Math.floor(top/24);gz<Math.ceil((top+h/scale)/24);gz++){
  if(known.has(gx+':'+gz))continue;
  ctx.rect(Math.floor(w/2+(gx*24-cx)*scale),Math.floor(h/2+(gz*24-cz)*scale),Math.ceil(24*scale)+1,Math.ceil(24*scale)+1);
 }
 ctx.fill();
}
export function createOceanView(canvas,{onReady=()=>{},onError=()=>{},onBuilding=()=>{},onPort=()=>{},onMerchant=()=>{},onMap=()=>{}}={}){
 const ctx=canvas.getContext('2d',{alpha:false});if(!ctx){onError('해도를 그릴 수 없어. 브라우저를 다시 열어줘.');return {setState(){},setMode(){},setQuality(){},setZoom(){}};}
 const townArt=new Image();townArt.src='./assets/harbor.webp';
 let fxStarted=0,lastFxSerial=0,miniHit=null;
 let state=null,mode='sea',facility='',frame=0,last=0,last2dPaint=0,zoom=2.2,quality='pixel',destroyed=false,hit=[],time=0,w=480,h=720,seaCamera='chase',cameraOrbit=0,cameraHeight=.32,cameraDistance=44;
 const mobileGPU=!!(window.matchMedia?.('(pointer:coarse)')?.matches&&window.innerWidth<900);
 // 기존 CC0 범선 GLB를 조명·파도·포격과 함께 근접 전투 장면에 사용한다.
 let naval=null,navalLoading=false,navalError=false;
 async function prepareNaval(){
  if(naval||navalLoading||navalError)return;navalLoading=true;
  try{
   const THREE=await import('three');
   const {GLTFLoader}=await import('../../assets/roblox/world-ghosts/native/mesh/three/examples/jsm/loaders/GLTFLoader.js');
   if(destroyed)return;
   const surface=document.createElement('canvas');surface.id='naval3d';surface.setAttribute('aria-hidden','true');surface.hidden=true;canvas.after(surface);
   let renderer;try{renderer=new THREE.WebGLRenderer({canvas:surface,antialias:true,alpha:false,powerPreference:'high-performance'});}catch(e){surface.remove();throw e;}
   // 선박 3D 장면만 도트 해상도 적용. UI와 초상화는 원래 해상도 유지.
   renderer.setPixelRatio(mobileGPU?Math.min(.72,1/(devicePixelRatio||1)+.32):Math.min(.95,Math.max(.68,1/(devicePixelRatio||1)+.2)));renderer.shadowMap.enabled=!mobileGPU;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.18;
   const world=new THREE.Scene();world.background=new THREE.Color('#87b9c7');world.fog=new THREE.Fog('#87b9c7',110,300);
   const camera=new THREE.PerspectiveCamera(44,1,.1,350);camera.position.set(25,28,39);
   // 항해 시점 수평선을 채우는 대기 하늘: 바람·악천후에 따라 천정/수평선 조명 변화.
   const skyMat=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,fog:false,
    uniforms:{horizon:{value:new THREE.Color('#b4d6d2')},zenith:{value:new THREE.Color('#32789e')}},
    vertexShader:'varying float h; void main(){h=normalize(position).y;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:'uniform vec3 horizon;uniform vec3 zenith;varying float h;void main(){float t=smoothstep(-0.10,0.85,h);gl_FragColor=vec4(mix(horizon,zenith,t),1.0);}'});
   const sky=new THREE.Mesh(new THREE.SphereGeometry(275,28,16),skyMat);sky.renderOrder=-100;world.add(sky);
   world.add(new THREE.HemisphereLight('#d8f2ff','#384450',2.1));const sun=new THREE.DirectionalLight('#fff0cc',3.1);sun.position.set(-35,65,20);sun.castShadow=!mobileGPU;sun.shadow.mapSize.set(mobileGPU?512:1024,mobileGPU?512:1024);Object.assign(sun.shadow.camera,{left:-55,right:55,top:55,bottom:-55,near:1,far:150});sun.shadow.bias=-.0004;world.add(sun);
   // 가까운 바다는 16px 손그림 점묘 질감, 먼 바다는 광택 잔물결로 구별한다.
   const waterTiles=document.createElement('canvas');waterTiles.width=128;waterTiles.height=128;
   const tile=waterTiles.getContext('2d');tile.fillStyle='#3b8997';tile.fillRect(0,0,128,128);
   for(let y=0;y<128;y+=8)for(let x=0;x<128;x+=8){
    const v=(x*59+y*37+x*y)%13;tile.fillStyle=['#367e8e','#3b8493','#408a98','#337b8b','#398190'][v%5];tile.fillRect(x,y,8,8);
    if(v%3===0){tile.fillStyle='#83b2b6';tile.fillRect(x+2,y+3,Math.min(6,2+v%5),1);}
   }
   const waterTex=new THREE.CanvasTexture(waterTiles);waterTex.wrapS=THREE.RepeatWrapping;waterTex.wrapT=THREE.RepeatWrapping;waterTex.repeat.set(58,58);
   waterTex.magFilter=THREE.LinearFilter;waterTex.minFilter=THREE.LinearMipmapLinearFilter;waterTex.colorSpace=THREE.SRGBColorSpace;
   const water=new THREE.Mesh(new THREE.PlaneGeometry(600,600,mobileGPU?32:60,mobileGPU?32:60),new THREE.MeshStandardMaterial({color:'#d6eff0',map:waterTex,roughness:.43,metalness:.08,flatShading:false,emissive:'#143b47',emissiveIntensity:.07}));
   // 그래픽: 등록된 Kenney CC0 파도 원본을 수면의 실제 미세 요철로 소비한다.
   new THREE.TextureLoader().load('./assets/cc0/map/textureWater.png',texture=>{
    if(destroyed){texture.dispose();return;}
    texture.wrapS=THREE.RepeatWrapping;texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(72,72);
    water.material.bumpMap=texture;water.material.bumpScale=.10;water.material.needsUpdate=true;
   },undefined,error=>console.warn('기존 수면 유지 · CC0 파도 적재 지연',error));
   water.rotation.x=-Math.PI/2;water.receiveShadow=true;world.add(water);
   const whitecaps=new Float32Array(64*6),capGeometry=new THREE.BufferGeometry();capGeometry.setAttribute('position',new THREE.BufferAttribute(whitecaps,3));
   const crests=new THREE.LineSegments(capGeometry,new THREE.LineBasicMaterial({color:'#dff7ee',transparent:true,opacity:.39,depthWrite:false}));world.add(crests);
   const ring=new THREE.Mesh(new THREE.RingGeometry(58.8,59.1,128),new THREE.MeshBasicMaterial({color:'#eed49c',transparent:true,opacity:.36,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=.2;world.add(ring);
   // 64픽셀 게임 내 자체 제작 나무·돛 질감. 최근접 텍스처로 판재와 천 올을 살린다.
   function pixelTexture(wood){
    const paper=document.createElement('canvas');paper.width=64;paper.height=64;const ctx=paper.getContext('2d');
    const swatches=wood?['#6e4730','#7b5336','#8d603b','#946943','#a4784c','#523927']:['#ede0bb','#e8d5ac','#dcc69b','#f5e8c8','#cdbb9c','#efe3c6'];
    for(let y=0;y<64;y+=4)for(let x=0;x<64;x+=4){
     const hash=((x*131+y*37+x*y*3)>>>2)%11;
     ctx.fillStyle=swatches[hash%6];ctx.fillRect(x,y,4,4);
     if((wood?y%16===0:x%16===0)){ctx.fillStyle=wood?'#442e24':'#af9a78';ctx.fillRect(x,y,4,1);}
    }
    if(wood)for(let y=0;y<64;y+=16){ctx.fillStyle='#4a3027';ctx.fillRect(0,y,64,2);for(let x=(y/16%2)*16;x<64;x+=32){ctx.fillStyle='#c5a070';ctx.fillRect(x+5,y+4,2,2);ctx.fillRect(x+24,y+11,2,2);}}
    else{ctx.fillStyle='#b6a37e';for(let x=0;x<64;x+=12)for(let y=0;y<64;y+=8)ctx.fillRect(x+(y%16?1:0),y,1,2);}
    const texture=new THREE.CanvasTexture(paper);texture.colorSpace=THREE.SRGBColorSpace;texture.magFilter=THREE.NearestFilter;texture.minFilter=THREE.NearestMipmapNearestFilter;return texture;
   }
   const pixelWood=pixelTexture(true),pixelLinen=pixelTexture(false);
   const loader=new GLTFLoader(),templates=new Map(),vessels=new Map();
   // GLB는 공유하고 개별 배의 자세·피격·침몰 표현만 독립적으로 움직인다.
   async function template(file){if(!templates.has(file))templates.set(file,loader.loadAsync('./assets/'+file+'.glb').then(g=>g.scene));return templates.get(file);}
   function vessel(id,type,enemy){
    const design=SHIP_TYPES.find(t=>t.id===type)||SHIP_TYPES[0],large=/galleon|frigate|carrack|fluyt|racer/.test(type),galley=design.rig==='oars';
    const file=enemy?'ship-pirate-medium':large?'ship-large':/sloop|caravel/.test(type)?'ship-small':'ship-medium';
    let entry=vessels.get(id);if(entry?.type===type&&entry.enemy===enemy&&(id!=='player'||entry.gunCount===state.ship.cannons))return entry;if(entry)world.remove(entry.root);
    const root=new THREE.Group();world.add(root);entry={root,file,type,enemy,loaded:false,sails:[],wake:null,gunCount:id==='player'?state.ship.cannons:large?12:6};vessels.set(id,entry);
    // GLB 준비 중에도 3D 범선이 즉시 보인다. 모델 오류가 해전 전체를 2D로 강등시키지 않는다.
    const length=large?14:galley?13:10,beam=(large?2.5:1.75)*(design.width||1);
    const hullShape=new THREE.Shape();
    hullShape.moveTo(0,-length*.59);
    hullShape.bezierCurveTo(-beam*.72,-length*.47,-beam,length*.1,-beam*.82,length*.40);
    hullShape.quadraticCurveTo(0,length*.64,beam*.82,length*.40);
    hullShape.bezierCurveTo(beam,length*.1,beam*.72,-length*.47,0,-length*.59);
    const hullMesh=new THREE.Mesh(new THREE.ExtrudeGeometry(hullShape,{depth:.81,steps:1,bevelEnabled:true,bevelThickness:.17,bevelSize:.14,bevelSegments:1,curveSegments:9}),new THREE.MeshStandardMaterial({color:enemy?'#50382e':'#6d452b',roughness:.95,metalness:.02}));
    hullMesh.rotation.x=-Math.PI/2;hullMesh.position.y=.38;hullMesh.castShadow=true;hullMesh.receiveShadow=true;root.add(hullMesh);
    const deckMesh=new THREE.Mesh(new THREE.ExtrudeGeometry(hullShape,{depth:.10,bevelEnabled:false,curveSegments:9}),new THREE.MeshStandardMaterial({color:'#b58a5c',roughness:1}));
    deckMesh.rotation.x=-Math.PI/2;deckMesh.position.y=1.10;deckMesh.receiveShadow=true;root.add(deckMesh);
    // 원본 CC0 모델 성공 시 선체만 교체, 이후 추가한 선종별 포문과 장식은 유지한다.
    template(file).then(model=>{
     if(destroyed||vessels.get(id)!==entry)return;
     const copy=model.clone(true),box=new THREE.Box3().setFromObject(copy),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
     const unit=length/Math.max(1,size.x,size.z);
     copy.position.set(-center.x*unit,-box.min.y*unit-.50,-center.z*unit);copy.scale.set(unit*(design.width||1),unit,unit*(design.length||1));
     copy.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;
      const refine=m=>{if(!m)return m;const mat=m.clone();if('roughness' in mat)mat.roughness=.87;if('metalness' in mat)mat.metalness=.025;
       if(mat.map){mat.map.magFilter=THREE.NearestFilter;mat.map.minFilter=THREE.NearestMipmapNearestFilter;mat.map.needsUpdate=true;}return mat;};
      o.material=Array.isArray(o.material)?o.material.map(refine):refine(o.material);}});
     root.remove(hullMesh,deckMesh);hullMesh.geometry.dispose();deckMesh.geometry.dispose();root.add(copy);entry.loaded=true;
    }).catch(e=>{console.warn('선박 모델 불러오기 실패 — 자체 3D 범선 선체 유지',file,e);});
     const trim=new THREE.MeshStandardMaterial({color:enemy?'#bc7463':design.color||'#c5a06d',roughness:.68});
     const wood=new THREE.MeshStandardMaterial({color:design.hullColor||'#f5e5d2',map:pixelWood,roughness:1,metalness:0});
     const brass=new THREE.MeshStandardMaterial({color:'#bd985d',roughness:.47,metalness:.55});
     const sailMat=new THREE.MeshStandardMaterial({color:enemy?'#e3b7a0':/french/.test(type)?'#dcecf0':'#fff4d8',map:pixelLinen,side:THREE.DoubleSide,roughness:1});
     const rig=galley||design.rig==='lateen'||/caravel/.test(type)?'lateen':'square';
     // 선종 고유 선폭과 돛배치: 코그·카락·갤리온·플루트·프리깃·갤리를 구분한다.
     const nMasts=design.masts||2,mastZ=nMasts===3?[-length*.27,0,length*.29]:nMasts===2?[-length*.23,length*.25]:[0];
     for(const side of [-1,1]){
      const rail=new THREE.Mesh(new THREE.BoxGeometry(.09,.12,length*.75),trim);rail.position.set(side*beam,1.2,0);root.add(rail);
      // 옆판 금속 장식과 선측 난간: 선폭이 다른 선박에서도 포문과 선체가 분리되어 보인다.
      for(const y of [.46,1.16]){
       const rubbing=new THREE.Mesh(new THREE.BoxGeometry(.065,.065,length*.74),y===.46?brass:wood);
       rubbing.position.set(side*(beam-.06),y,0);root.add(rubbing);
      }
      for(let j=0;j<7;j++){
       const railPost=new THREE.Mesh(new THREE.CylinderGeometry(.045,.055,.48,6),wood);
       railPost.position.set(side*beam,1.31,-length*.34+j*length*.115);root.add(railPost);
      }
      const cannons=Math.min(8,Math.max(2,Math.ceil((id==='player'?state.ship.cannons:large?12:6)/2)));
      for(let i=0;i<cannons;i++){const z=-length*.35+i*length*.70/Math.max(1,cannons-1);
       const barrel=new THREE.Mesh(new THREE.CylinderGeometry(.14,.17,.68,8),wood);
       barrel.rotation.z=Math.PI/2;barrel.position.set(side*(beam+.26),.85,z);root.add(barrel);
       const rim=new THREE.Mesh(new THREE.TorusGeometry(.17,.024,6,9),brass);rim.rotation.y=Math.PI/2;rim.position.set(side*(beam+.60),.85,z);root.add(rim);}
     }
     for(const z of mastZ){
      const height=large?6.3:5.4,mast=new THREE.Mesh(new THREE.CylinderGeometry(.075,.13,height,8),wood);mast.position.set(0,1+height/2,z);root.add(mast);
      const nest=new THREE.Mesh(new THREE.CylinderGeometry(.44,.35,.18,10),wood);nest.position.set(0,height+.69,z);root.add(nest);
      for(const side of [-1,1]){const shroud=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,height+.75,z),new THREE.Vector3(side*beam,1.2,z-length*.29)]);root.add(new THREE.Line(shroud,new THREE.LineBasicMaterial({color:'#674632'})));}
      const geometry=new THREE.BufferGeometry(),v=rig==='lateen'?[-2.55,2.75,0,2.5,6.1,0,2.25,2.65,.35]:[-2.15,3,0,2.15,3,0,2.1,5.65,.35,-2.15,3,0,2.1,5.65,.35,-2.1,5.65,.35];
      geometry.setAttribute('position',new THREE.Float32BufferAttribute(v,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(rig==='lateen'?[0,0,.5,1,1,0]:[0,0,1,0,1,1,0,0,1,1,0,1],2));geometry.computeVertexNormals();
      const sail=new THREE.Mesh(geometry,sailMat);sail.position.z=z;sail.castShadow=true;root.add(sail);entry.sails.push(sail);
      // 돛의 가로 누비선과 두께감: 원본 GLB를 유지하면서 천·목재 구조만 덧그린다.
      for(let seam=0;seam<4;seam++){
       const y=3.05+seam*.58;
       const line=new THREE.Mesh(new THREE.CylinderGeometry(.018,.018,3.2+seam*.14,5),wood);
       line.rotation.z=Math.PI/2;line.position.set(0,y,z+.05);root.add(line);
      }
      const yard=new THREE.Mesh(new THREE.CylinderGeometry(.045,.045,4.9,6),wood);yard.rotation.z=Math.PI/2;yard.position.set(0,rig==='lateen'?3.9:5.7,z);root.add(yard);
      const lines=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-beam,1.2,-length*.45),new THREE.Vector3(0,height+1,z),new THREE.Vector3(beam,1.2,length*.45)]);
      root.add(new THREE.Line(lines,new THREE.LineBasicMaterial({color:'#d3bfa2'})));
      const flag=new THREE.Mesh(new THREE.ConeGeometry(.28,1.1,3),trim);flag.rotation.z=Math.PI/2;flag.position.set(.55,height+1.4,z);root.add(flag);
     }
     if(galley)for(const side of [-1,1])for(let i=0;i<8;i++){const oar=new THREE.Mesh(new THREE.BoxGeometry(3.2,.07,.14),wood);oar.position.set(side*3.15,.65,-length*.36+i*length*.105);root.add(oar);}
     if(!galley){const cabin=new THREE.Mesh(new THREE.BoxGeometry(beam*1.5,design.sternHeight||1.05,2),wood);cabin.position.set(0,1.32+(design.sternHeight||1.05)/2,length*.39);root.add(cabin);for(let i=-1;i<=1;i++){const pane=new THREE.Mesh(new THREE.BoxGeometry(.36,.34,.05),brass);pane.position.set(i*.68,1.95,length*.39+1.04);root.add(pane);}
      const gallery=new THREE.Mesh(new THREE.BoxGeometry(beam*1.45,.1,.18),brass);gallery.position.set(0,2.45,length*.39+1.08);root.add(gallery);}
     // 갑판 뚜껑·돛줄 고정대·선수상: 크기와 선종을 구분하는 가까운 시점 디테일.
     for(let j=0;j<3;j++){const hatch=new THREE.Mesh(new THREE.BoxGeometry(beam*.70,.09,.50),j===1?trim:wood);hatch.position.set(0,1.27,-length*.25+j*length*.24);root.add(hatch);}
     const bowsprit=new THREE.Mesh(new THREE.CylinderGeometry(.055,.085,length*.37,7),wood);
     bowsprit.rotation.x=Math.PI*.42;bowsprit.position.set(0,1.8,-length*.49);root.add(bowsprit);
     if(id==='player'&&state.ship.gear.figurehead!=='none'){const ornament=new THREE.Mesh(new THREE.IcosahedronGeometry(.34,0),brass);ornament.position.set(0,.96,-length*.61);root.add(ornament);}
     // 선미 타륜, 목재 판재층, 양현 등불을 가까운 카메라에서도 식별 가능하게 한다.
     const helm=new THREE.Group(),wheel=new THREE.Mesh(new THREE.TorusGeometry(.42,.075,6,12),wood);wheel.rotation.y=Math.PI/2;helm.add(wheel);
     for(let i=0;i<8;i++){const spoke=new THREE.Mesh(new THREE.BoxGeometry(.76,.055,.055),trim);spoke.rotation.x=i*Math.PI/4;helm.add(spoke);}
     helm.position.set(0,2.35,length*.27);root.add(helm);
     for(let y=.4;y<1.2;y+=.22)for(const side of [-1,1]){const plank=new THREE.Mesh(new THREE.BoxGeometry(.04,.038,length*.64),y<.7?wood:trim);plank.position.set(side*beam*.96,y,0);root.add(plank);}
     const lampMat=new THREE.MeshStandardMaterial({color:'#ffcc88',emissive:'#935621',emissiveIntensity:.38});
     for(const side of [-1,1]){const lantern=new THREE.Mesh(new THREE.BoxGeometry(.22,.34,.22),lampMat);lantern.position.set(side*beam*.65,2.13,length*.45);root.add(lantern);}
     // 선종 고유 실루엣: 느린 코그의 높은 선루, 카락의 이중 성곽, 플루트의 화물 선미 등.
     const addBox=(x,y,z,sx,sy,sz,material)=>{
      const obj=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),material);
      obj.position.set(x,y,z);obj.castShadow=true;obj.receiveShadow=true;root.add(obj);return obj;
     };
     const lowerDeck=galley?1.35:large?1.85:1.55;
     if(/cog/.test(type)){
      addBox(0,lowerDeck,length*.36,beam*1.65,.86,2,wood);
      addBox(0,lowerDeck+.53,length*.37,beam*1.78,.17,2.25,trim);
      addBox(0,1.58,-length*.44,beam*1.38,.57,1.15,wood);
     }
     if(/carrack|iberian-galleon/.test(type)){
      addBox(0,2.3,length*.38,beam*1.67,1.18,2.35,trim);
      addBox(0,3.03,length*.38,beam*1.4,.14,2.45,brass);
      addBox(0,1.75,-length*.42,beam*1.45,1.04,length*.15,wood);
      for(let i=-2;i<=2;i++){
       const pane=addBox(i*beam*.29,2.50,length*.38+1.23,.22,.3,.05,brass);
       pane.castShadow=false;
      }
     }
     if(/dutch-fluyt/.test(type)){
      const barrelMaterial=new THREE.MeshStandardMaterial({color:'#98724b',roughness:1});
      for(let i=-1;i<=1;i++)for(const side of [-1,1]){
       const load=new THREE.Mesh(new THREE.CylinderGeometry(.32,.36,.85,8),barrelMaterial);
       load.rotation.z=Math.PI/2;load.position.set(side*(.35+i*.48),1.65,-length*.16);root.add(load);
      }
      addBox(0,2.23,length*.40,beam*1.45,.53,1.65,trim);
     }
     if(/french-frigate|english-racer/.test(type)){
      for(const side of [-1,1]){
       addBox(side*beam*.88,1.63,0,.17,.2,length*.72,brass);
       for(let i=0;i<10;i++)addBox(side*beam*.86,1.41,-length*.34+i*length*.075,.06,.31,.08,wood);
      }
      addBox(0,1.75,length*.40,beam*1.1,.24,2.15,trim);
     }
     if(galley){
      const benches=9;
      for(let i=0;i<benches;i++){const z=-length*.38+i*length*.086;addBox(0,1.48,z,beam*1.9,.12,.19,trim);}
      addBox(0,1.65,-length*.42,beam*.62,.54,1,wood);
     }
     if(/caravel/.test(type)){
      addBox(0,1.43,length*.42,beam*1.35,.47,1.45,trim);
      for(const side of [-1,1])addBox(side*beam*.86,1.62,-length*.05,.1,.19,length*.5,wood);
     }
     // 선체 손상 시 검게 그을린 판재를 시각화하고 돛의 색조가 미묘하게 어두워진다.
     if(id==='player'){
      const damage=new THREE.Group(),scorch=new THREE.MeshBasicMaterial({color:'#332822',transparent:true,opacity:.78});
      for(const side of [-1,1])for(let i=0;i<4;i++){
       const patch=new THREE.Mesh(new THREE.BoxGeometry(.045,.14+i*.045,.24+i*.09),scorch);
       patch.position.set(side*(beam+.04),.75+i*.13,-length*.27+i*length*.18);damage.add(patch);
      }
      root.add(damage);entry.damage=damage;
     }
     // 바다 항적: 불투명한 흰 사각형 대신 속도에 따라 벌어지는 V형 물보라 조각.
     const wake=new THREE.Group();
     const foamMaterial=new THREE.MeshBasicMaterial({color:'#e1f7ed',transparent:true,opacity:.71,side:THREE.DoubleSide,depthWrite:false});
     const sprayMaterial=new THREE.MeshBasicMaterial({color:'#aedbd9',transparent:true,opacity:.49,side:THREE.DoubleSide,depthWrite:false});
     // 선수는 -Z, 선미는 +Z: 이전에는 항적을 선수 앞으로 그리는 오류가 있었다.
     // 선미 V자 후류, 두 겹 거품대, 선수 양옆 포말을 속도와 연동한다.
     for(const side of [-1,1])for(let j=0;j<11;j++){
      const z=length*.47+j*.95,x=side*(beam*.34+j*.31);
      const foam=new THREE.Mesh(new THREE.PlaneGeometry(.24+j*.064,.48+j*.14),j%3===0?sprayMaterial:foamMaterial);
      foam.rotation.x=-Math.PI/2;foam.rotation.z=side*(.17+j*.01);foam.position.set(x,.05,z);wake.add(foam);
      if(j<7){const fine=new THREE.Mesh(new THREE.PlaneGeometry(.16+j*.03,.29+j*.085),sprayMaterial);
       fine.rotation.x=-Math.PI/2;fine.position.set(x+side*.54,.075,z+.42);wake.add(fine);}
     }
     for(const side of [-1,1])for(let i=0;i<5;i++){
      const bow=new THREE.Mesh(new THREE.PlaneGeometry(.27+i*.13,.54+i*.11),i%2?foamMaterial:sprayMaterial);
      bow.rotation.x=-Math.PI/2;bow.rotation.z=side*.36;
      bow.position.set(side*(beam*.48+i*.23),.06,-length*.48+i*.39);wake.add(bow);
     }
     root.add(wake);entry.wake=wake;
    return entry;
   }
   const shots=[],ballGeo=new THREE.SphereGeometry(.2,7,5),ballMat=new THREE.MeshBasicMaterial({color:'#302c26'}),smokeGeo=new THREE.SphereGeometry(1,8,6),smokeMat=new THREE.MeshBasicMaterial({color:'#b7b7aa',transparent:true,opacity:.43,depthWrite:false}),
    flashGeo=new THREE.IcosahedronGeometry(.45,0),flashMat=new THREE.MeshBasicMaterial({color:'#ffb74d',transparent:true,opacity:.92,depthWrite:false}),
    splashGeo=new THREE.RingGeometry(.45,.84,14),splashMat=new THREE.MeshBasicMaterial({color:'#e3f7ec',transparent:true,opacity:.75,side:THREE.DoubleSide,depthWrite:false});
   let serial=0,shotTime=0,sw=0,sh=0,battleFraming=false;
   const targetLook=new THREE.Vector3(),skyLow=new THREE.Color(),skyHigh=new THREE.Color();
   const gulls=new THREE.Group();world.add(gulls);
   for(let i=0;i<6;i++){
    const wing=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-.7,0,0),new THREE.Vector3(0,.18,0),new THREE.Vector3(.7,0,0)]);
    gulls.add(new THREE.Line(wing,new THREE.LineBasicMaterial({color:0xf2ecd9})));
   }
   naval={surface,renderer,world,camera,vessels,gulls,render(t){
    const cw=canvas.clientWidth,ch=canvas.clientHeight;if(cw!==sw||ch!==sh){sw=cw;sh=ch;renderer.setSize(cw,ch,false);camera.aspect=cw/ch;camera.updateProjectionMatrix();}
    const origin=state.ship,hostiles=state.pirates.filter(e=>e.hull>0&&(!e.neutral||state.diplomacy[e.faction]<0)&&Math.hypot(e.x-origin.x,e.z-origin.z)<70);
    // 선박을 카메라가 따라가도 지면처럼 보이는 수면 질감은 세계 좌표로 흘러 항해 이동을 즉시 체감하게 한다.
    waterTex.offset.set((((origin.x*.06)%1)+1)%1,((((origin.z*.06)%1)+1)%1));
    const merchants=mode==='sea'?(state.merchants||[]).filter(m=>!state.crewRoster.includes(m.id)).map(m=>({...m,...merchantPosition(m)})).filter(m=>Math.hypot(m.x-origin.x,m.z-origin.z)<85):[];
    const rows=[{id:'player',x:origin.x,z:origin.z,heading:origin.heading,type:state.shipType,hull:origin.hull,maxHull:origin.maxHull},...hostiles.map(e=>({...e,type:e.neutral?'cog':'galleon',enemy:!e.neutral})),...merchants.map(m=>({id:'merchant-'+m.id,x:m.x,z:m.z,heading:m.heading,type:'dutch-fluyt',enemy:false}))];
    const ids=new Set(rows.map(r=>r.id));for(const [id,e]of vessels){e.root.visible=ids.has(id);}
    gulls.visible=mode!=='naval'&&PORTS.some(p=>Math.hypot(p.x-origin.x,p.z-origin.z)<65);
    if(gulls.visible)gulls.children.forEach((bird,i)=>{
     const angle=t*.25+i*1.05,radius=11+i*1.8;
     bird.position.set(Math.sin(angle)*radius,9+i*.65+Math.sin(t*1.1+i)*.4,Math.cos(angle)*radius);
     bird.rotation.y=-angle;const points=bird.geometry.attributes.position;
     points.setY(0,Math.sin(t*4+i)*.35);points.setY(2,Math.sin(t*4+i)*.35);points.needsUpdate=true;
    });
    const wind=windAt(state);for(const r of rows){const e=vessel(r.id,r.type,!!r.enemy);e.root.position.set(r.x-origin.x,.12+Math.sin(t*1.8+Number(r.enemy))*.14,r.z-origin.z);// Ship meshes have their bow along -Z while sailing physics moves along +Z.
     // Rotate the visible hull into the same heading as its actual travel.
     e.root.rotation.set(Math.sin(t*1.5)*.025,r.heading+Math.PI,Math.sin(t*1.2+Number(r.enemy))*.035);for(const cloth of e.sails){cloth.rotation.y=Math.sin(wind.heading-r.heading)*.15;cloth.rotation.z=Math.sin(wind.heading-r.heading)*.035+Math.sin(t*1.5)*.012;}if(e.wake){e.wake.visible=r.id==='player'?Math.abs(origin.velocity)>.5:true;e.wake.scale.setScalar(.7+Math.min(1.3,Math.abs(r.id==='player'?origin.velocity:3)*.13));e.wake.position.y=.02+Math.sin(t*3)*.015;}if(e.damage)e.damage.visible=r.id==='player'&&origin.hull/Math.max(1,origin.maxHull)<.53;}
    const enemy=hostiles.sort((a,b)=>Math.hypot(a.x-origin.x,a.z-origin.z)-Math.hypot(b.x-origin.x,b.z-origin.z))[0];
    const ex=enemy?enemy.x-origin.x:15,ez=enemy?enemy.z-origin.z:0;
    if(mode==='naval'){
     // 메인: 두 선체와 UI 여백을 함께 담는다. 세로 화면의 수평 시야각이 거리 기준이다.
     const halfFov=Math.atan(Math.tan(camera.fov*Math.PI/360)*Math.min(1,camera.aspect));
     const radius=Math.hypot(ex,ez)*.5+14,distance=radius/Math.sin(halfFov*.70);
     targetLook.set(ex*.5,1.5,ez*.5);
     const position=targetLook.clone().add(new THREE.Vector3(.32,.86,.62).normalize().multiplyScalar(distance));
     world.fog.near=distance+radius;world.fog.far=distance+radius*4;
     camera.far=Math.max(350,distance+radius*3);camera.updateProjectionMatrix();
     if(!battleFraming)camera.position.copy(position);else camera.position.lerp(position,.14);
     camera.lookAt(targetLook);
    }else{const bearing=origin.heading+cameraOrbit;camera.position.lerp(new THREE.Vector3(-Math.sin(bearing)*cameraDistance,4+cameraDistance*cameraHeight,-Math.cos(bearing)*cameraDistance),.13);targetLook.set(Math.sin(origin.heading)*3,2.5,Math.cos(origin.heading)*3);camera.lookAt(targetLook);}
    battleFraming=mode==='naval';if(!battleFraming){world.fog.near=110;world.fog.far=300;}
    ring.visible=mode==='naval';ring.position.x=ex;ring.position.z=ez;
    const storm=state.climate?.kind==='storm',rain=state.climate?.kind==='rain';
     const a=water.geometry.attributes.position;
     for(let i=0;i<a.count;i++){const x=a.getX(i)+origin.x*.14,y=a.getY(i)+origin.z*.14;
      const long=Math.sin(x*.105+t*1.2)*.27+Math.sin(y*.15+t*.83)*.22,short=Math.sin((x+y)*.31+t*2.4)*.075+Math.cos((x-y)*.22-t*1.7)*.06;
      a.setZ(i,(long+short)*(storm?2.15:rain?1.3:1));}
     a.needsUpdate=true;
     if(Math.round(t*12)%2===0)water.geometry.computeVertexNormals();
     const tint=storm?'#477486':rain?'#7096a5':'#87b9c7';world.background.set(tint);world.fog.color.set(tint);sun.intensity=storm?1.7:rain?2.4:3.1;
     sky.position.copy(camera.position);
     skyLow.set(storm?'#6c8492':rain?'#b1bfc2':'#b7d7cf');
     skyHigh.set(storm?'#273c53':rain?'#5c7a88':'#327ca0');
     skyMat.uniforms.horizon.value.copy(skyLow);skyMat.uniforms.zenith.value.copy(skyHigh);
     water.material.roughness=storm?.60:rain?.51:.43;crests.material.opacity=storm?.72:rain?.52:.35;
     // 64개의 짧은 비균일 포말선: 물결 속도·파향에 따라 해면에서 이동한다.
     for(let i=0;i<(mobileGPU?36:64);i++){
      const gx=((i*71+(t*(1+wind.strength)*4))%230+230)%230-115,gz=((i*113+t*2)%220+220)%220-110;
      const surge=Math.sin(gx*.11+t*1.3)*.27+Math.sin(gz*.16+t*.8)*.22;
      const yy=Math.max(.12,surge*.8)+.12,half=.25+(i%4)*.24;
      const dx=Math.sin(wind.heading)*half,dz=Math.cos(wind.heading)*half,j=i*6;
      whitecaps[j]=gx-dx;whitecaps[j+1]=yy;whitecaps[j+2]=gz-dz;whitecaps[j+3]=gx+dx;whitecaps[j+4]=yy;whitecaps[j+5]=gz+dz;
     }
     capGeometry.attributes.position.needsUpdate=true;capGeometry.computeBoundingSphere();
    const fx=state.combatFx;if(fx?.type==='cannon'&&fx.serial!==serial){serial=fx.serial;shotTime=t;
     for(const o of shots)world.remove(o);shots.length=0;
     const volleyCount=Math.min(7,Math.max(3,Math.ceil((fx.count||5)/3)));
     for(let i=0;i<volleyCount;i++){
      const offset=(i-(volleyCount-1)/2)*.7;
      const ball=new THREE.Mesh(ballGeo,ballMat);ball.userData={kind:'ball',from:fx.from,to:fx.to,offset};shots.push(ball);world.add(ball);
      const puff=new THREE.Mesh(smokeGeo,smokeMat);puff.userData={kind:'smoke',from:fx.from,to:fx.to,offset};shots.push(puff);world.add(puff);
      const flash=new THREE.Mesh(flashGeo,flashMat);flash.userData={kind:'flash',from:fx.from,to:fx.to,offset};shots.push(flash);world.add(flash);
     }
     for(let i=0;i<4;i++){const splash=new THREE.Mesh(splashGeo,splashMat);splash.rotation.x=-Math.PI/2;
      splash.userData={kind:'splash',from:fx.from,to:fx.to,offset:(i-1.5)*.72};shots.push(splash);world.add(splash);}
    }
    const age=t-shotTime;for(const o of shots){const d=o.userData,progress=Math.min(1,age/.55);
     if(d.kind==='smoke'){o.visible=age<1.18;o.position.set(d.from.x-origin.x+d.offset*.65,1.9+age*1.6,d.from.z-origin.z);o.scale.setScalar(.17+age*1.12);}
     else if(d.kind==='flash'){o.visible=age<.17;o.position.set(d.from.x-origin.x+d.offset,1.35,d.from.z-origin.z);o.scale.setScalar(.4+(1-age/.17)*.7);}
     else if(d.kind==='splash'){o.visible=age>.36&&age<1.28;o.position.set(d.to.x-origin.x+d.offset,.09,d.to.z-origin.z+d.offset*.22);o.scale.setScalar(.4+(age-.36)*2.5);}
     else{o.visible=age<.55;o.position.set(d.from.x+(d.to.x-d.from.x)*progress-origin.x+d.offset,1.5+Math.sin(progress*Math.PI)*2.3,d.from.z+(d.to.z-d.from.z)*progress-origin.z);}}
    renderer.render(world,camera);surface.dataset.ready=String(rows.every(r=>vessels.get(r.id)?.loaded));surface.dataset.models=String(rows.filter(r=>vessels.get(r.id)?.loaded).length);surface.dataset.triangles=String(renderer.info.render.triangles);surface.dataset.shot=String(serial);surface.dataset.playerX=String(origin.x);surface.dataset.playerZ=String(origin.z);surface.dataset.camera=mode==='naval'?'battle':seaCamera;
   }};
  }catch(e){navalError=true;console.warn('해상 3D 장면 초기화 실패',e);}finally{navalLoading=false;}
 }
 function navalSea(){
  hit=[];miniHit=null;const gradient=ctx.createLinearGradient(0,0,0,h);gradient.addColorStop(0,'#8ebbc8');gradient.addColorStop(.2,'#245d73');gradient.addColorStop(1,'#102f48');ctx.fillStyle=gradient;ctx.fillRect(0,0,w,h);
  const enemies=state.pirates.filter(e=>e.hull>0&&(!e.neutral||state.diplomacy[e.faction]<0)&&Math.hypot(e.x-state.ship.x,e.z-state.ship.z)<65);
  const foe=enemies[0],distance=foe?Math.hypot(foe.x-state.ship.x,foe.z-state.ship.z):20,scale=Math.min(3.2,(w-80)/(distance+32),(h*.48)/(distance+32));
  for(let i=0;i<40;i++){ctx.strokeStyle='#b3e0de22';ctx.beginPath();const y=(i*43+time*9)%h;ctx.ellipse((i*97)%w,y,20+i%5*4,3,0,0,Math.PI*2);ctx.stroke();}
  const centerX=(foe?foe.x-state.ship.x:0)*.5,centerZ=(foe?foe.z-state.ship.z:0)*.5;
  ship(w*.5-centerX*scale,h*.56-centerZ*scale,state.ship.heading,state.shipType,false,1.55,state.ship.cannons);
  for(const e of enemies)ship(w*.5+(e.x-state.ship.x-centerX)*scale,h*.56+(e.z-state.ship.z-centerZ)*scale,e.heading,'galleon',true,1.55,10);
  if(!navalError){prepareNaval();text('입체 함대 장면 준비 중',w/2,h*.35,12,C.gold,'center');}
 }
 // 성능: 변경 없는 해안선·국경·미개척 안개는 오프스크린 해도에서 재사용한다.
 const seaLayer=document.createElement('canvas'),seaCtx=seaLayer.getContext('2d');
 const miniLayer=document.createElement('canvas'),miniCtx=miniLayer.getContext('2d');
 let seaAnchorX=NaN,seaAnchorZ=NaN,seaScale=0,seaKnown=-1,miniKey='';
 const rect=(x,y,a,b,c)=>{ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),Math.round(a),Math.round(b));};
 function text(t,x,y,size=11,color=C.gold,align='left'){ctx.font=`bold ${size}px system-ui`;ctx.fillStyle=color;ctx.textAlign=align;ctx.fillText(t,Math.round(x),Math.round(y));ctx.textAlign='left';}
 // 선종마다 선체 길이·선폭·돛대·노·포문이 구분되는 픽셀 범선.
 function ship(x,y,heading,type='caravel',enemy=false,scale=1,ports=6){
  const design=SHIP_TYPES.find(t=>t.id===type)||SHIP_TYPES[0],rig=design.rig||(type==='caravel'?'lateen':'square');
  const large=/galleon|fluyt|frigate|carrack/.test(type),galley=rig==='oars'||/galley/.test(type);
  const beam=(large?9:galley?5.5:7)*(design.width||1),length=(large?22:galley?25:18)*(design.length||1);
  const hull=enemy?'#704238':design.hullColor||'#805537',trim=enemy?'#b16c50':'#c3a071',sail=enemy?'#c9b7a1':'#f2e6c8';
  ctx.save();ctx.translate(Math.round(x),Math.round(y+Math.sin(time*2+(enemy?2:0))*.7));ctx.rotate(Math.PI-heading);ctx.scale(scale,scale);
  ctx.fillStyle='#071d2766';ctx.beginPath();ctx.ellipse(3,5,beam+6,length+5,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#242e30';ctx.beginPath();ctx.moveTo(0,-length-9);ctx.bezierCurveTo(-beam-3,-length*.5,-beam-5,length*.68,-beam*.55,length+3);ctx.quadraticCurveTo(0,length+10,beam*.55,length+3);ctx.bezierCurveTo(beam+5,length*.68,beam+3,-length*.5,0,-length-9);ctx.closePath();ctx.fill();
  ctx.fillStyle=hull;ctx.beginPath();ctx.moveTo(0,-length-5);ctx.bezierCurveTo(-beam,-length*.5,-beam,length*.6,-beam*.45,length);ctx.quadraticCurveTo(0,length+6,beam*.45,length);ctx.bezierCurveTo(beam,length*.6,beam,-length*.5,0,-length-5);ctx.closePath();ctx.fill();
  rect(-beam+2,-length*.45,beam*2-4,length*1.14,enemy?'#745c4d':'#a27b4f');rect(-beam+3,-length*.3,beam*2-6,2,trim);
  ctx.strokeStyle='#593d2870';ctx.lineWidth=.55;for(let py=-length*.4;py<length*.7;py+=2){ctx.beginPath();ctx.moveTo(-beam+2,py);ctx.lineTo(beam-2,py);ctx.stroke();}
  // 갑판 판재 이음매·못·줄 걸이·격자 화물창을 짧은 도트선으로 표현한다.
  for(let py=-length*.40;py<length*.69;py+=4){
   const stagger=Math.round(py/4)%2;for(let px=-beam+3+stagger*3;px<beam-2;px+=6){rect(px,py,1,1,'#4b3424');rect(px+1,py,1,1,'#d6ac74');}
  }
  for(const hy of [-length*.13,length*.34]){
   rect(-beam*.45,hy,beam*.90,4,'#4f382d');
   rect(-beam*.37,hy+1,beam*.74,2,'#75533a');
   for(let col=-1;col<=1;col++)rect(col*beam*.22,hy+1,1,2,'#362f2b');
  }
  ctx.strokeStyle=trim;ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(-beam+1,length*.7);ctx.lineTo(-beam+1,-length*.5);ctx.lineTo(0,-length-5);ctx.lineTo(beam-1,-length*.5);ctx.lineTo(beam-1,length*.7);ctx.stroke();
  if(large){rect(-beam+1,length*.45,beam*2-2,9,'#4f372f');rect(-beam+2,length*.50,beam*2-4,3,trim);rect(-beam*.6,-length*.74,beam*1.2,5,'#b28b57');
   for(let j=-2;j<=2;j++)rect(j*beam*.33,length*.60,2,3,'#e6c48f');
   rect(-beam*.55,length*.77,beam*1.1,2,'#c99f60');}
  // 양현 난간 기둥과 선실의 타륜.
  for(let py=-length*.55;py<length*.55;py+=5){rect(-beam,py,2,3,trim);rect(beam-2,py,2,3,trim);}
  ctx.strokeStyle='#c8a36c';ctx.lineWidth=1;ctx.beginPath();ctx.arc(0,length*.51,3,0,Math.PI*2);ctx.stroke();
  rect(-.5,length*.49,1,4,'#e6c58a');rect(-2,length*.51,4,1,'#e6c58a');
  const holes=Math.max(2,Math.min(10,Math.round(ports/2)));
  for(let i=0;i<holes;i++){const py=-length*.56+i*(length*1.33)/Math.max(1,holes-1);
   rect(-beam-2,py,5,4,trim);rect(-beam-1,py+1,3,2,'#1b2629');rect(beam-3,py,5,4,trim);rect(beam-2,py+1,3,2,'#1b2629');
   rect(-beam-2,py+1,1,1,'#d8bb83');rect(beam+1,py+1,1,1,'#d8bb83');
  }
  if(galley){for(let i=0;i<7;i++){const py=-length*.55+i*6;rect(-beam-10,py,11,2,'#c7a774');rect(beam,py,11,2,'#c7a774');}}
  const masts=design.masts===3?[-length*.55,length*.05,length*.59]:design.masts===1?[-length*.32]:[-length*.52,length*.4];
  for(let i=0;i<masts.length;i++){
   const sy=masts[i];rect(-1,sy-10,2,20,'#4c3528');
   if(rig==='lateen'||galley||(!enemy&&type===state.shipType&&state.ship.gear.sail==='lateen'&&i===masts.length-1)){
    ctx.fillStyle=sail;ctx.beginPath();ctx.moveTo(-1,sy-13);ctx.lineTo(-beam-7,sy+10);ctx.lineTo(beam+6,sy+8);ctx.closePath();ctx.fill();rect(-beam-7,sy+9,beam*2+13,1,'#b6a27d');
   }else{const width=large?beam+5:beam+3;ctx.fillStyle=sail;ctx.beginPath();ctx.moveTo(-width,sy-8);ctx.quadraticCurveTo(0,sy-4+Math.sin(time*2+i)*1.5,width,sy-8);ctx.lineTo(width-1,sy+3);ctx.quadraticCurveTo(0,sy+7,-width+1,sy+3);ctx.closePath();ctx.fill();ctx.strokeStyle='#aa927055';ctx.lineWidth=.6;for(let seam=-width+4;seam<width;seam+=4){ctx.beginPath();ctx.moveTo(seam,sy-6);ctx.lineTo(seam,sy+3);ctx.stroke();}rect(-width+2,sy+3,width*2-4,2,enemy?'#927e70':'#b2aa91');rect(-width-2,sy-9,width*2+4,2,'#694a34');}
  }
  ctx.strokeStyle='#dac49c80';ctx.lineWidth=.55;for(const sy of masts){ctx.beginPath();ctx.moveTo(-beam,length*.85);ctx.lineTo(0,sy-10);ctx.lineTo(beam,length*.85);ctx.moveTo(0,sy-10);ctx.lineTo(0,-length-6);ctx.stroke();}
  rect(-2,-length-8,4,4,enemy?'#db8167':'#ead2a0');rect(1,-length-7,6,2,enemy?'#c66d54':design.color||'#cd9867');
  if(!enemy&&state.ship.gear.figurehead!=='none'){rect(-3,-length-12,6,5,'#e2bb72');rect(-1,-length-15,2,4,'#f4de9c');}
  // 뱃머리의 국적 깃발과 후방 도트 물결.
  rect(-2,-length-17,1,9,'#f1d9a9');rect(-1,-length-17,7,2,enemy?'#b85c45':design.color||'#e7ce9c');rect(0,-length-15,5,2,enemy?'#85382b':'#ead1a1');
  if(Math.abs(state.ship.velocity||0)>.4){ctx.globalAlpha=.52;for(let i=0;i<5;i++)for(const side of [-1,1])rect(side*(beam*.6+4+i*2),length+8+i*3,4+i,1,i%2?'#b9e5db':'#e5f6ed');ctx.globalAlpha=1;}
  ctx.restore();
 }

 // 항해 화면: 지역명·항로·선박·파도·전투 상태를 겹쳐 표시한다.
 function sea(){
  const cx=state.ship.x,cz=state.ship.z;
  const sw=Math.round(w*1.55),sh=Math.round(h*1.55);
  const limitX=(sw-w)*.33/zoom,limitZ=(sh-h)*.33/zoom;
  if(seaLayer.width!==sw||seaLayer.height!==sh||seaScale!==zoom||seaKnown!==state.charted.length||Math.abs(cx-seaAnchorX)>limitX||Math.abs(cz-seaAnchorZ)>limitZ){
   seaLayer.width=sw;seaLayer.height=sh;seaCtx.imageSmoothingEnabled=false;
   drawGeography(seaCtx,sw,sh,cx,cz,zoom);drawFog(seaCtx,sw,sh,cx,cz,zoom,state.charted);
   seaAnchorX=cx;seaAnchorZ=cz;seaScale=zoom;seaKnown=state.charted.length;
  }
  ctx.drawImage(seaLayer,Math.round(w/2-sw/2+(seaAnchorX-cx)*zoom),Math.round(h/2-sh/2+(seaAnchorZ-cz)*zoom));
  ctx.globalAlpha=.25;
  for(let i=0;i<45;i++){const wx=(i*89+time*6)%w,wy=(i*53+time*2)%h;rect(wx,wy,11,1,'#b9e5df');rect(wx+4,wy+2,6,1,'#e0f2e6');}
  ctx.globalAlpha=1;
  const x=v=>w/2+(v-cx)*zoom,z=v=>h/2+(v-cz)*zoom;
  if(state.route.length){
   ctx.strokeStyle='#f0d58b';ctx.setLineDash([4,5]);ctx.lineWidth=1.5;
   ctx.beginPath();ctx.moveTo(w/2,h/2);for(const p of state.route)ctx.lineTo(x(p.x),z(p.z));ctx.stroke();ctx.setLineDash([]);
  }
  hit=[];
  for(const p of PORTS){
   if(!state.discovered.includes(p.id))continue;
   const px=x(p.x),py=z(p.z);if(px<-30||px>w+30||py<75||py>h-80)continue;
   rect(px-6,py-4,12,9,'#27302b');rect(px-4,py-7,8,6,'#be9965');rect(px-2,py-10,4,4,'#e1c18c');
   text(p.name,px,py-16,11,'#fff0cb','center');hit.push({x:px-25,y:py-30,w:50,h:48,port:p.id});
  }
  for(const p of state.pirates)if(p.hull>0&&state.charted.includes(Math.floor(p.x/24)+':'+Math.floor(p.z/24))){
   const enemy=p.neutral?'#9dc5cd':'#e5a28e';ship(x(p.x),z(p.z),p.heading,p.neutral?'cog':'galleon',!p.neutral,.7,p.neutral?4:10);
   const distance=Math.hypot(p.x-cx,p.z-cz);
   if(distance<45){const ex=x(p.x),ey=z(p.z);rect(ex-19,ey-31,38,4,'#302b28');rect(ex-19,ey-31,38*p.hull/p.maxHull,4,enemy);}
  }
  // 이동 중인 실제 교역 선박(소유 화물·목적지·선장 이름)을 바다에 표시한다.
  for(const m of state.merchants||[]){
   if(state.crewRoster.includes(m.id))continue;
   const p=merchantPosition(m),px=x(p.x),py=z(p.z);
   if(px<-40||px>w+40||py<65||py>h-70)continue;
   const known=state.charted.includes(Math.floor(p.x/24)+':'+Math.floor(p.z/24));
   if(!known)continue;
   ship(px,py,p.heading,'dutch-fluyt',false,.68,6);
   const captain=MERCHANT_CAPTAINS.find(c=>c.id===m.id);
   if(captain){text(captain.name,px,py-27,9,'#f5d6a3','center');rect(px-4,py-39,8,5,'#d6b57b');}
   hit.push({x:px-21,y:py-29,w:42,h:55,merchant:m.id});
  }
  if(state.fleet>=2)ship(w/2-26,h/2+29,state.ship.heading,'cog',false,.73,6);
  if(state.fleet>=3)ship(w/2+27,h/2+31,state.ship.heading,'galleon',false,.73,8);
  // 배 후미의 항적과 선회 거품
  const motion=Math.abs(state.ship.velocity||0);if(motion>.6){
   const sn=Math.sin(state.ship.heading),cs=Math.cos(state.ship.heading);
   ctx.strokeStyle='#ddf5e39c';ctx.lineWidth=2;
   for(let i=0;i<3;i++){const off=14+i*8+Math.sin(time*5+i)*2;ctx.beginPath();ctx.moveTo(w/2-sn*off-cs*(7+i*2),h/2-cs*off+sn*(7+i*2));ctx.lineTo(w/2-sn*(off+12)-cs*(9+i*3),h/2-cs*(off+12)+sn*(9+i*3));ctx.stroke();}
  }
  ship(w/2,h/2,state.ship.heading,state.shipType,false,1.02,state.ship.cannons);
  const pulse=Math.sin(time*3)*2;ctx.strokeStyle='#c8e4df88';ctx.beginPath();ctx.arc(w/2,h/2,26+pulse,0,Math.PI*2);ctx.stroke();
  const region=cz<-626?'북해 · 잉글랜드 해협':cz<-540?'잉글랜드 해협 · 비스케이만':cx>48&&cz>-545?'지중해 · 티레니아해':'대서양 · 이베리아 연안';
  rect(w/2-85,77,170,20,'#17313fc7');text(region,w/2,91,11,'#f2e4c3','center');
  text('북',w-23,110,12);rect(w-24,115,2,19,C.gold);text('↑',w-23,124,14,C.gold,'center');
 }

 const places=[['market','교역소',.22,.22,'#9d6750'],['fleet','조선소',.77,.60,'#596f70'],['crew','선술집',.22,.39,'#ae7546'],['palace','왕궁 · 총독부',.77,.22,'#726b8d'],['quests','탐험가 사무실',.77,.39,'#497c72'],['jobs','직업 길드',.22,.62,'#74694a']];
 // 도시마다 실제 입점 시설과 거리를 다르게 배치한다.
 function cityPlaces(){
  const current=PORTS.find(p=>Math.hypot(p.x-state.ship.x,p.z-state.ship.z)<5)||PORTS[0],profile=PORT_SCENES[current.id]||PORT_SCENES.dawn;
  const facilities=places.filter(p=>profile.facilities.includes(p[0]));
  if(profile.layout%2)facilities.reverse();
  const [x,y,cw,ch]=HARBOR_VIEWS[profile.layout];
  return facilities.map(p=>[p[0],p[1],(p[2]-x)/cw,(p[3]-y)/ch,p[4]]);
 }
 function building(x,y,bw,bh,label,color){rect(x-3,y+bh-2,bw+6,6,'#493d2f');rect(x,y,bw,bh,'#d0b78b');rect(x-5,y-12,bw+10,14,color);rect(x+2,y-19,bw-4,9,color);rect(x+7,y+10,13,13,'#3e5960');rect(x+bw-20,y+10,13,13,'#3e5960');rect(x+bw/2-7,y+bh-23,14,23,'#634b36');rect(x+bw/2-2,y+bh-13,2,3,'#e7c27d');rect(x-8,y+bh+6,bw+16,20,'#332e28');text(label,x+bw/2,y+bh+20,11,'#f2d7a1','center');}
 function town(){
  if(townArt.complete&&townArt.naturalWidth){
   const townPort=PORTS.find(p=>Math.hypot(p.x-state.ship.x,p.z-state.ship.z)<5)||PORTS[0];
   const profile=PORT_SCENES[townPort.id],crop=HARBOR_VIEWS[profile.layout];
   ctx.drawImage(townArt,crop[0]*townArt.naturalWidth,crop[1]*townArt.naturalHeight,crop[2]*townArt.naturalWidth,crop[3]*townArt.naturalHeight,0,75,w,h-75);
   const shades={'영국 왕실':'#284c6750','포르투갈 상단':'#86602b44','북해 상인연맹':'#4b72824b','프랑스 항구동맹':'#526b9450','이베리아 왕실':'#9a76424a','지중해 공화국':'#81704b44'};
   rect(0,75,w,h-75,shades[townPort.faction]||'#55726a40');
   // 항구의 수면 반사와 갈매기는 표시만 바꾸고 시설 클릭 영역은 원화 좌표와 함께 유지한다.
   ctx.save();ctx.strokeStyle='#e3ead49c';ctx.lineWidth=1;
   for(let i=0;i<18;i++){const x=(i*71+time*8)%w,y=h*.84+(i%5)*(h*.025);ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+8+Math.sin(time+i)*4,y);ctx.stroke();}
   ctx.strokeStyle='#e9e0bc';
   for(let i=0;i<3;i++){const x=(time*9+i*w*.31)%w,y=87+Math.sin(time*.6+i)*6;ctx.beginPath();ctx.moveTo(x-5,y);ctx.quadraticCurveTo(x-2,y-4,x,y);ctx.quadraticCurveTo(x+2,y-4,x+5,y);ctx.stroke();}
   ctx.restore();
   rect(0,75,w,48,'#162e37cd');text(townPort.name+' 항구 · '+townPort.region,w/2,97,15,'#ffe4aa','center');text(townPort.faction+' | 1590',w/2,113,10,'#e4caa7','center');
   hit=[];for(const [id,label,px,py,color] of cityPlaces()){const x=w*px,y=75+(h-75)*py;rect(x-52,y,104,21,'#2b2c2de8');text(label,x,y+14,11,C.gold,'center');hit.push({x:x-60,y:y-30,w:120,h:64,building:id});}rect(w/2-122,128,244,22,'#263335cb');text('교역 · 선술집 · 조선소 · 왕궁',w/2,144,11,C.gold,'center');return;}
  rect(0,0,w,h,'#7c8b68');for(let y=90;y<h;y+=16)for(let x=0;x<w;x+=16)rect(x+((y/16)%2?8:0),y,2,2,'#657c5b');
  rect(w*.41,105,w*.19,h-140,'#b6a27a');rect(0,h*.49,w,h*.09,'#b6a27a');
  for(let y=110;y<h-90;y+=12){rect(w*.44,y,15,1,'#8f815e');rect(w*.53,y+5,16,1,'#d0b88b');}
  rect(0,h-135,w,135,C.sea);rect(w*.4,h-143,w*.2,82,'#78573b');for(let y=h-140;y<h-65;y+=8)rect(w*.4,y,w*.2,1,'#bd9666');ship(w*.5,h-56,0,state.shipType,false,1.1);
  hit=[];for(const [id,label,px,py,color] of cityPlaces()){const bw=Math.min(96,w*.27),bh=45,row=id==='market'||id==='palace'?0:id==='crew'||id==='quests'?1:2,x=w*(px<.5?.23:.77)-bw/2,y=150+Math.max(190,h-370)*row/2;building(x,y,bw,bh,label,color);hit.push({x:x-8,y:y-23,w:bw+16,h:bh+55,building:id});}
  for(let i=0;i<7;i++){const x=w*.48+Math.sin(time*.2+i)*w*.12,y=150+(i*61)%(h-300);rect(x,y,5,5,'#dbb288');rect(x-1,y+5,7,8,['#704e47','#426271','#b18a51'][i%3]);rect(x,y+13,2,4,'#3c3930');rect(x+4,y+13,2,4,'#3c3930');}
  const p=PORTS.find(p=>Math.hypot(p.x-state.ship.x,p.z-state.ship.z)<4);text((p?.name||'항구')+' · 시설을 눌러 들어가',w/2,109,13,'#fff0cb','center');
 }
 function interior(){
  if(townArt.complete&&townArt.naturalWidth){const crops={market:[.02,.10,.44,.24],crew:[.02,.28,.44,.24],jobs:[.02,.47,.44,.25],palace:[.55,.10,.44,.25],quests:[.55,.29,.44,.24],fleet:[.55,.46,.44,.27]},r=crops[facility]||crops.market;ctx.drawImage(townArt,r[0]*townArt.naturalWidth,r[1]*townArt.naturalHeight,r[2]*townArt.naturalWidth,r[3]*townArt.naturalHeight,0,75,w,h-75);rect(0,75,w,h-75,'#15252d44');text({market:'교역소 · 특산품 거래',crew:'선술집 · 동료와 소문',jobs:'길드 · 전직',palace:'왕궁 · 총독부',quests:'탐험가 사무실',fleet:'조선소 · 선박과 포대'}[facility]||'항구 시설',w/2,111,14,'#fff0c9','center');return;}
  const color={market:'#78674e',fleet:'#425e64',crew:'#5b4235',palace:'#47445a',quests:'#52604c',jobs:'#575441'}[facility]||'#5b4235';rect(0,0,w,h,color);
  // 시설별 전체 배경: 창·목조 들보·진열품·왕좌·해도 책상.
  for(let x=0;x<w;x+=55)rect(x,0,7,h,'#302d29');rect(0,120,w,9,'#302d29');
  for(let x=30;x<w;x+=120){rect(x,160,65,85,'#d4b779');rect(x+5,165,55,75,facility==='crew'?'#be9b55':'#8cb4ac');rect(x+30,165,5,75,'#4a4336');rect(x+5,200,55,5,'#4a4336');}
  rect(0,h*.68,w,h*.32,'#554433');for(let y=h*.68;y<h;y+=18)rect(0,y,w,2,'#42362e');
  if(facility==='fleet'){rect(20,h*.63,w-40,15,'#8b6844');ship(w/2,h*.69,Math.PI/2,'galleon',false,3);}
  else if(facility==='palace'){rect(w*.38,130,w*.24,h*.65,'#813e3d');rect(w*.43,h*.55,w*.14,85,'#b49455');rect(w*.45,h*.57,w*.1,52,'#704349');}
  else if(facility==='market'){for(let i=0;i<9;i++){const x=15+i%3*150,y=h*.53+Math.floor(i/3)*55;rect(x,y,65,43,'#987247');rect(x+3,y+5,59,2,'#c5a276');rect(x+31,y,3,43,'#604932');}}
  else {rect(w*.08,h*.72,w*.84,32,'#9b774e');if(facility==='quests'||facility==='jobs'){rect(w*.22,h*.67,w*.5,25,'#ddc893');text('航海',w*.45,h*.70,15,'#715a37');}else for(let i=0;i<4;i++)rect(40+i*100,h*.69,15,20,'#b4945e');}
 }
 function unitPoint(side,index){const b=state.landBattle,base=Math.max(170,h*.30),gap=Math.min(78,h*.12);if(side==='enemy')return {x:w*.76,y:base+index*gap};return b?.party.length>2?{x:w*(index%2?.35:.14),y:base+Math.floor(index/2)*gap}:{x:w*.23,y:base+index*gap};}
 function pixelPerson(x,y,id,enemy=false,dead=false){
  const pattern=['00111100','01111110','01222210','00222200','00333300','03333330','04333340','00444400','00500500','00500500'],index=['eleanor','samira','amani','arjun','rin','thomas','isabel','willem','freya','diego'].indexOf(id),colors={1:index===4?'#252b32':index===8?'#d8c387':'#6a4634',2:index===2?'#8b6048':'#e0af86',3:enemy?'#7c3c38':['#315775','#568a82','#e6c689','#b1733d','#677cac'][Math.max(0,index)%5],4:'#765444',5:'#293138'};ctx.save();if(dead)ctx.globalAlpha=.3;rect(x-14,y-2,28,6,'#182d2a66');const offset=dead?8:Math.round(Math.sin(time*2+index));for(let row=0;row<pattern.length;row++)for(let col=0;col<8;col++){const c=pattern[row][col];if(c!=='0')rect(x+(col-4)*3,y+(row-10)*3+offset,3,3,colors[c]);}if(!dead){rect(x+12,y-15,3,16,'#e0ded1');rect(x+9,y-2,9,2,'#bf9b55');}ctx.restore();
 }
 function animal(x,y,kind,dead){ctx.save();if(dead)ctx.globalAlpha=.3;const boar=kind==='boar',color=boar?'#78564a':'#9caaa1';rect(x-19,y-20,35,15,color);rect(x+12,y-27,15,18,color);rect(x-13,y-5,5,10,'#4a4540');rect(x+10,y-5,5,10,'#4a4540');rect(x-26,y-21,11,5,color);rect(x+12,y-34,5,9,color);rect(x+22,y-34,5,9,color);rect(x+21,y-22,3,3,'#e7bd6f');if(boar){rect(x+24,y-12,9,3,'#eee3c4');rect(x+28,y-18,3,6,'#eee3c4');}ctx.restore();}
 function landScene(){
  const b=state.landBattle;rect(0,0,w,h,'#718574');rect(0,100,w,h*.26,'#9b9e7a');rect(0,h*.45,w,h*.55,'#7b8560');
  for(let i=0;i<30;i++){const x=(i*73)%w,y=120+(i*59)%Math.max(1,h-230);rect(x,y,9,3,'#566b4c');rect(x+2,y-4,2,5,'#a3ab74');}
  for(let i=0;i<5;i++){const x=15+i*(w-30)/4;rect(x,123,11,70,'#bbb49a');rect(x-5,116,21,9,'#d0c5a6');rect(x-3,188,17,7,'#8d9279');}
  if(!b)return;text((SITES.find(t=>t.id===b.siteId)?.name||'유적')+' · 입구 전투',w/2,103,12,'#f5e7b6','center');
  for(let i=0;i<b.party.length;i++){const p=b.party[i],at=unitPoint('party',i);pixelPerson(at.x,at.y,p.id,false,p.hp<=0);text(CREW.find(c=>c.id===p.id)?.name||'동료',at.x,at.y+17,9,'#fff0bf','center');rect(at.x-22,at.y+22,44,4,'#392f28');rect(at.x-22,at.y+22,44*p.hp/p.maxHp,4,'#8ed6a3');if(b.phase==='player'&&i===b.actor)text('▼',at.x,at.y-39,13,'#ffe39a','center');}
  for(let i=0;i<b.enemies.length;i++){const e=b.enemies[i],at=unitPoint('enemy',i);if(e.kind==='wolf'||e.kind==='boar')animal(at.x,at.y,e.kind,e.hp<=0);else pixelPerson(at.x,at.y,'willem',true,e.hp<=0);text(e.name,at.x,at.y+17,9,'#ffe0bd','center');rect(at.x-22,at.y+22,44,4,'#392f28');rect(at.x-22,at.y+22,44*e.hp/e.maxHp,4,'#e59b78');}
  if(b.phase==='won')text('승리 · 유적을 조사할 수 있어',w/2,h*.52,16,'#ffe6a4','center');
 }
 function drawImpact(){const fx=state.combatFx,rawAge=(performance.now()-fxStarted)/1000;if(!fx||rawAge>1.4)return;let age=rawAge;const seaFx=fx.type==='cannon';let at;
  if(seaFx){
   if(mode!=='sea')return;
   const x=v=>w/2+(v-state.ship.x)*zoom,z=v=>h/2+(v-state.ship.z)*zoom;
   at={x:x(fx.to.x),y:z(fx.to.z)};
   const from={x:x(fx.from.x),y:z(fx.from.z)};
   const count=Math.min(8,Math.max(2,Math.round((fx.count||4)/2)));
   const flight=Math.max(.12,Math.min(.65,Math.hypot(at.x-from.x,at.y-from.y)/(fx.speed||180)));
   const strength=fx.gun==='bombard'?1.45:fx.gun==='falconet'?.8:1;
   ctx.save();
   for(let i=0;i<count;i++){
    const delay=i*.045,progress=(age-delay)/flight;
    if(progress<0||progress>1)continue;
    const spread=(i-(count-1)/2)*3.2,dX=at.x-from.x,dY=at.y-from.y,magnitude=Math.max(1,Math.hypot(dX,dY));
    const sideX=-dY/magnitude*spread,sideY=dX/magnitude*spread;
    const px=from.x+dX*progress+sideX,py=from.y+dY*progress+sideY;
    ctx.strokeStyle=i%2?'#ffe2a4':'#fff9d4';ctx.lineWidth=1.2*strength;
    ctx.beginPath();ctx.moveTo(px-dX*.04,py-dY*.04);ctx.lineTo(px,py);ctx.stroke();
    rect(px-2*strength,py-2*strength,3*strength,3*strength,'#fff3bf');
   }
   const muzzleAge=age;
   if(muzzleAge<.23){const glow=Math.max(0,1-muzzleAge/.23);ctx.globalAlpha=glow*.85;ctx.fillStyle='#fff3ac';ctx.beginPath();ctx.arc(from.x,from.y,3+18*glow*strength,0,Math.PI*2);ctx.fill();ctx.fillStyle='#ccbdae';for(let i=0;i<6;i++){ctx.globalAlpha=glow*.2;ctx.beginPath();ctx.arc(from.x+Math.sin(i*2.4)*12,from.y-Math.cos(i)*7-muzzleAge*24,6+muzzleAge*33,0,Math.PI*2);ctx.fill();}}
   ctx.restore();
   if(age<flight)return;age-=flight;
  }
  else{if(mode!=='battle')return;at=unitPoint(fx.side||'enemy',fx.target||0);at.y-=18;}
  const fade=Math.max(0,1-age);
  ctx.save();ctx.globalAlpha=fade;
  if(fx.type==='heal'||fx.type==='guard'){ctx.strokeStyle=fx.type==='heal'?'#91f0b3':'#a2ddff';ctx.lineWidth=3;ctx.beginPath();ctx.arc(at.x,at.y,18+age*25,0,Math.PI*2);ctx.stroke();for(let i=0;i<6;i++){const x=at.x+Math.sin(i*2)*24,y=at.y+Math.cos(i*2)*20-age*24;rect(x-3,y,7,2,'#d0ffe2');rect(x,y-3,2,7,'#d0ffe2');}}
  else {if(age<.4){ctx.strokeStyle=fx.type==='skill'?'#fff3bd':'#fff0dc';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(at.x-25,at.y+23);ctx.lineTo(at.x+25,at.y-23);ctx.moveTo(at.x-17,at.y-22);ctx.lineTo(at.x+17,at.y+22);ctx.stroke();}for(let i=0;i<14;i++){const angle=i*2.399,r=12+age*65,x=at.x+Math.cos(angle)*r,y=at.y+Math.sin(angle)*r+age*age*25;rect(x,y,i%3?4:7,i%3?4:7,i%2?'#ffcd62':'#f98548');}if(seaFx){ctx.fillStyle='#e2d3ad';for(let i=0;i<5;i++){ctx.globalAlpha=fade*.5;ctx.beginPath();ctx.arc(at.x+Math.sin(i*3)*20,at.y-age*28+Math.cos(i)*12,8+age*16,0,Math.PI*2);ctx.fill();}}}
  ctx.globalAlpha=fade;text((fx.type==='heal'?'+':'−')+Math.round(fx.damage||0),at.x,at.y-25-age*25,20,fx.type==='heal'?'#c5ffcf':'#fff0b1','center');ctx.restore();
 }

 function weatherOverlay(){const weather=state.climate?.kind,phase=(state.elapsed||0)/16;if(phase>.72||phase<.12){ctx.fillStyle=phase>.72?'#081a4b45':'#d8a25a20';ctx.fillRect(0,0,w,h);}if(mode!=='sea')return;if(weather==='rain'||weather==='storm'){ctx.strokeStyle='#c5e1e455';ctx.lineWidth=1;ctx.beginPath();for(let i=0;i<(weather==='storm'?60:30);i++){const x=(i*83+time*23)%w,y=(i*73+time*110)%h;ctx.moveTo(x,y);ctx.lineTo(x-3,y+8);}ctx.stroke();}if(weather==='fog'){ctx.fillStyle='#bdccbf30';ctx.fillRect(0,0,w,h);}if(weather==='storm'){ctx.fillStyle='#15293f30';ctx.fillRect(0,0,w,h);}}
 // 미니맵도 지형·미개척 구역은 변경 시에만 다시 그린다.
 function minimap(){
  const landscape=canvas.clientHeight<500,mw=landscape?94:128,mh=landscape?76:104;
  const mx=landscape?w/2-mw/2:w-mw-8,my=Math.max(110,landscape?h-mh-12:h-(canvas.clientHeight<700?270:310));
  miniHit={x:mx,y:my,w:mw,h:mh};
  const miniScale=landscape?.15:.20,key=mw+':'+mh+':'+state.charted.length;
  if(miniKey!==key){miniLayer.width=mw;miniLayer.height=mh;miniCtx.imageSmoothingEnabled=false;drawGeography(miniCtx,mw,mh,75,-550,miniScale);drawFog(miniCtx,mw,mh,75,-550,miniScale,state.charted);miniKey=key;}
  ctx.save();ctx.translate(mx,my);ctx.drawImage(miniLayer,0,0);
  ctx.strokeStyle='#ebd3a1';ctx.strokeRect(0,0,mw,mh);
  const x=mw/2+(state.ship.x-75)*miniScale,y=mh/2+(state.ship.z+550)*miniScale;
  ctx.fillStyle='#fff3b6';ctx.fillRect(x-3,y-3,6,6);
  if(state.destination){const p=PORTS.find(p=>p.id===state.destination);if(p){ctx.fillStyle='#f49367';ctx.fillRect(mw/2+(p.x-75)*miniScale-2,mh/2+(p.z+550)*miniScale-2,4,4);}}
  text('유럽 · 항로도',mw/2,mh+13,9,C.gold,'center');ctx.restore();
 }
 function render(now){if(destroyed)return;frame=requestAnimationFrame(render);if(now-last<(quality==='low'?60:mobileGPU?33:20))return;last=now;time=now/1000;
 const width=Math.min(mobileGPU?540:720,Math.max(mobileGPU?300:390,Math.round(canvas.clientWidth))),height=Math.round(width*canvas.clientHeight/Math.max(1,canvas.clientWidth));
 const pixelRatio=mobileGPU?1:2;
 if(w!==width||h!==height||canvas.width!==w*pixelRatio){w=width;h=height;canvas.width=w*pixelRatio;canvas.height=h*pixelRatio;}
 ctx.setTransform(pixelRatio,0,0,pixelRatio,0,0);ctx.imageSmoothingEnabled=true;if(!state)return;
 // 3D 항해가 덮고 있는 2D 지도는 저빈도 예비 화면으로만 업데이트한다.
 const visible3d=naval&&!naval.surface.hidden&&!navalError&&(mode==='naval'||mode==='sea'&&seaCamera!=='chart');
 const paint2d=!mobileGPU||!visible3d||now-last2dPaint>145;
 if(paint2d){last2dPaint=now;ctx.save();const impactAge=(performance.now()-fxStarted)/1000;if(impactAge<.45&&state.combatFx&&['cannon','skill','slash'].includes(state.combatFx.type))ctx.translate(Math.round(Math.sin(impactAge*90)*(1-impactAge/.45)*4),Math.round(Math.cos(impactAge*73)*(1-impactAge/.45)*3));mode==='battle'?landScene():mode==='naval'?navalSea():mode==='sea'?sea():facility?interior():town();weatherOverlay();drawImpact();if(mode==='sea')minimap();ctx.restore();}
 if((mode==='naval'||mode==='sea'&&seaCamera!=='chart')&&!navalError)prepareNaval();
 if(naval){const show=(mode==='naval'||mode==='sea'&&seaCamera!=='chart')&&!navalError;naval.surface.hidden=!show;
  if(show)try{naval.render(time);}catch(err){console.warn('3D 항해 프레임 복구: 2D 렌더로 자동 전환',err);navalError=true;naval.surface.hidden=true;}}
}
 let cameraTouch=null;
 // 왼쪽 화면은 모바일 전역 조타, 오른쪽 화면만 카메라 회전.
  canvas.addEventListener('pointerdown',e=>{if(mode==='sea'&&seaCamera!=='chart'&&e.clientX>window.innerWidth*.54)cameraTouch={id:e.pointerId,x:e.clientX,y:e.clientY};});
 canvas.addEventListener('pointermove',e=>{if(!cameraTouch||cameraTouch.id!==e.pointerId)return;const dx=e.clientX-cameraTouch.x,dy=e.clientY-cameraTouch.y;if(Math.abs(dx)+Math.abs(dy)>1){seaCamera='orbit';cameraOrbit+=dx*.009;cameraHeight=Math.max(.12,Math.min(.95,cameraHeight+dy*.003));cameraTouch.x=e.clientX;cameraTouch.y=e.clientY;}});
 for(const event of ['pointerup','pointercancel'])canvas.addEventListener(event,()=>{cameraTouch=null;});
 canvas.addEventListener('wheel',e=>{if(mode==='sea'&&seaCamera!=='chart'){e.preventDefault();cameraDistance=Math.max(12,Math.min(62,cameraDistance+Math.sign(e.deltaY)*2));}},{passive:false});
 canvas.addEventListener('click',e=>{if(mode==='sea'&&seaCamera!=='chart')return;const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*w,y=(e.clientY-r.top)/r.height*h;const target=hit.find(b=>x>=b.x&&x<=b.x+b.w&&y>=b.y&&y<=b.y+b.h);if(mode==='town'&&!facility&&target?.building)onBuilding(target.building);if(mode==='sea'&&target?.port)onPort(target.port);if(mode==='sea'&&target?.merchant)onMerchant(target.merchant);if(mode==='sea'&&!target&&miniHit&&x>=miniHit.x&&x<=miniHit.x+miniHit.w&&y>=miniHit.y&&y<=miniHit.y+miniHit.h)onMap();});
 frame=requestAnimationFrame(render);queueMicrotask(onReady);
 return {setCameraMode(v){seaCamera=['chase','orbit','chart'].includes(v)?v:'chase';if(seaCamera==='chase')cameraOrbit=0;return seaCamera;},getCameraMode(){return seaCamera;},setCameraDistance(scale){cameraDistance=Math.max(12,Math.min(62,cameraDistance*scale));},setState(s){state=s;if(s.combatFx?.serial&&s.combatFx.serial!==lastFxSerial){lastFxSerial=s.combatFx.serial;fxStarted=performance.now();}},setMode(next,room=''){mode=next;facility=room;hit=[];},setQuality(v){quality=v;},setZoom(v){zoom=Math.max(.35,Math.min(16,Number(v)||2.2));},getZoom(){return zoom;},dispose(){destroyed=true;cancelAnimationFrame(frame);if(naval){naval.gulls.children.forEach(b=>{b.geometry.dispose();b.material.dispose();});naval.renderer.dispose();naval.surface.remove();}}};
}
