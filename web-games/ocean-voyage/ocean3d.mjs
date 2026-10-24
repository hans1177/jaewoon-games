// 파일명: ocean3d.mjs · 기존 장면 책임 파일을 픽셀 해도·항구·시설 렌더러로 교체
// 임포트: 실제 해안선과 게임 규칙 공유. 저장·경제 규칙은 엔진이 담당한다.
import {PORTS,SHIP_TYPES,PORT_SCENES,MERCHANT_CAPTAINS,merchantPosition,portStatus,SITES,CREW} from './engine.mjs';
import {COUNTRIES} from './assets/countries.mjs';
import {LAND} from './assets/world.mjs';
const C={sea:'#22566c',deep:'#173e55',shore:'#dbc899',land:'#768564',dark:'#283f3c',gold:'#f0d398',wood:'#583c30',roof:'#954f42'};
export function drawGeography(ctx,w,h,cx,cz,scale){
 ctx.fillStyle=C.sea;ctx.fillRect(0,0,w,h);ctx.save();ctx.translate(w/2-cx*scale,h/2-cz*scale);ctx.scale(scale,scale);
 const left=cx-w/2/scale,right=cx+w/2/scale,top=cz-h/2/scale,bottom=cz+h/2/scale;
 for(const ring of LAND){if(ring.box[2]<left||ring.box[0]>right||ring.box[3]<top||ring.box[1]>bottom)continue;ctx.beginPath();ring.points.forEach(([x,z],i)=>i?ctx.lineTo(x,z):ctx.moveTo(x,z));ctx.closePath();ctx.lineJoin='round';ctx.lineWidth=2.4/scale;ctx.strokeStyle=C.shore;ctx.stroke();ctx.fillStyle=C.land;ctx.fill();}
 ctx.strokeStyle='#c8d8a450';ctx.lineWidth=.7/scale;ctx.setLineDash([2/scale,2/scale]);
 for(const c of COUNTRIES){for(const ring of c.rings){ctx.beginPath();ring.forEach(([x,z],i)=>i?ctx.lineTo(x,z):ctx.moveTo(x,z));ctx.stroke();}}
 ctx.setLineDash([]);ctx.restore();
 if(scale>.5){ctx.font='bold '+(w<200?7:11)+'px system-ui';ctx.fillStyle='#f4e1ad';ctx.textAlign='center';for(const c of COUNTRIES){const x=w/2+(c.lon-cx)*scale,y=h/2+(c.z-cz)*scale;if(x>10&&x<w-10&&y>20&&y<h-20)ctx.fillText(c.name,x,y);}ctx.textAlign='left';}
}
export function drawFog(ctx,w,h,cx,cz,scale,charted){const known=new Set(charted),left=cx-w/2/scale,top=cz-h/2/scale;ctx.fillStyle='#071a2deB';ctx.beginPath();for(let gx=Math.floor(left/24);gx<Math.ceil((left+w/scale)/24);gx++)for(let gz=Math.floor(top/24);gz<Math.ceil((top+h/scale)/24);gz++)if(!known.has(gx+':'+gz))ctx.rect(Math.floor(w/2+(gx*24-cx)*scale),Math.floor(h/2+(gz*24-cz)*scale),Math.ceil(24*scale)+1,Math.ceil(24*scale)+1);ctx.fill();}
export function createOceanView(canvas,{onReady=()=>{},onError=()=>{},onBuilding=()=>{},onPort=()=>{},onMerchant=()=>{}}={}){
 const ctx=canvas.getContext('2d',{alpha:false});if(!ctx){onError('해도를 그릴 수 없어. 브라우저를 다시 열어줘.');return {setState(){},setMode(){},setQuality(){},setZoom(){}};}
 const townArt=new Image();townArt.src='./assets/harbor.webp';
 let fxStarted=0,lastFxSerial=0;
 let state=null,mode='sea',facility='',frame=0,last=0,zoom=4.8,quality='pixel',destroyed=false,hit=[],time=0,w=480,h=720;
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
  const hull=enemy?'#704238':'#805537',trim=enemy?'#b16c50':'#c3a071',sail=enemy?'#c9b7a1':'#f2e6c8';
  ctx.save();ctx.translate(Math.round(x),Math.round(y+Math.sin(time*2+(enemy?2:0))*.7));ctx.rotate(Math.PI-heading);ctx.scale(scale,scale);
  ctx.fillStyle='#071d2766';ctx.beginPath();ctx.ellipse(3,5,beam+6,length+5,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#242e30';ctx.beginPath();ctx.moveTo(0,-length-9);ctx.bezierCurveTo(-beam-3,-length*.5,-beam-5,length*.68,-beam*.55,length+3);ctx.quadraticCurveTo(0,length+10,beam*.55,length+3);ctx.bezierCurveTo(beam+5,length*.68,beam+3,-length*.5,0,-length-9);ctx.closePath();ctx.fill();
  ctx.fillStyle=hull;ctx.beginPath();ctx.moveTo(0,-length-5);ctx.bezierCurveTo(-beam,-length*.5,-beam,length*.6,-beam*.45,length);ctx.quadraticCurveTo(0,length+6,beam*.45,length);ctx.bezierCurveTo(beam,length*.6,beam,-length*.5,0,-length-5);ctx.closePath();ctx.fill();
  rect(-beam+2,-length*.45,beam*2-4,length*1.14,enemy?'#745c4d':'#a27b4f');rect(-beam+3,-length*.3,beam*2-6,2,trim);
  if(large){rect(-beam+1,length*.45,beam*2-2,9,'#4f372f');rect(-beam+2,length*.50,beam*2-4,3,trim);rect(-beam*.6,-length*.74,beam*1.2,5,'#b28b57');}
  const holes=Math.max(2,Math.min(10,Math.round(ports/2)));
  for(let i=0;i<holes;i++){const py=-length*.56+i*(length*1.33)/Math.max(1,holes-1);rect(-beam-1,py,4,3,'#1b2629');rect(beam-3,py,4,3,'#1b2629');}
  if(galley){for(let i=0;i<7;i++){const py=-length*.55+i*6;rect(-beam-10,py,11,2,'#c7a774');rect(beam,py,11,2,'#c7a774');}}
  const masts=large?[-length*.55,length*.05,length*.59]:galley?[-length*.32]:[-length*.52,length*.4];
  for(let i=0;i<masts.length;i++){
   const sy=masts[i];rect(-1,sy-10,2,20,'#4c3528');
   if(rig==='lateen'||galley||(!enemy&&type===state.shipType&&state.ship.gear.sail==='lateen'&&i===masts.length-1)){
    ctx.fillStyle=sail;ctx.beginPath();ctx.moveTo(-1,sy-13);ctx.lineTo(-beam-7,sy+10);ctx.lineTo(beam+6,sy+8);ctx.closePath();ctx.fill();rect(-beam-7,sy+9,beam*2+13,1,'#b6a27d');
   }else{const width=large?beam+5:beam+3;rect(-width,sy-8,width*2,11,sail);rect(-width+2,sy+3,width*2-4,2,enemy?'#927e70':'#b2aa91');rect(-width-2,sy-9,width*2+4,2,'#694a34');}
  }
  rect(-2,-length-8,4,4,enemy?'#db8167':'#ead2a0');rect(1,-length-7,6,2,enemy?'#c66d54':design.color||'#cd9867');
  if(!enemy&&state.ship.gear.figurehead!=='none'){rect(-3,-length-12,6,5,'#e2bb72');rect(-1,-length-15,2,4,'#f4de9c');}
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

 const places=[['market','교역소',.18,.35,'#9d6750'],['fleet','조선소',.77,.63,'#596f70'],['crew','선술집',.22,.60,'#ae7546'],['palace','왕궁 · 총독부',.72,.29,'#726b8d'],['quests','탐험가 사무실',.72,.47,'#497c72'],['jobs','직업 길드',.25,.79,'#74694a']];
 // 도시마다 실제 입점 시설과 거리를 다르게 배치한다.
 function cityPlaces(){
  const current=PORTS.find(p=>Math.hypot(p.x-state.ship.x,p.z-state.ship.z)<5)||PORTS[0],profile=PORT_SCENES[current.id]||PORT_SCENES.dawn;
  const facilities=places.filter(p=>profile.facilities.includes(p[0]));
  if(profile.layout%2)facilities.reverse();
  return facilities.map((p,i)=>[p[0],p[1],i%2?.74:.25,.27+Math.floor(i/2)*.24,p[4]]);
 }
 function building(x,y,bw,bh,label,color){rect(x-3,y+bh-2,bw+6,6,'#493d2f');rect(x,y,bw,bh,'#d0b78b');rect(x-5,y-12,bw+10,14,color);rect(x+2,y-19,bw-4,9,color);rect(x+7,y+10,13,13,'#3e5960');rect(x+bw-20,y+10,13,13,'#3e5960');rect(x+bw/2-7,y+bh-23,14,23,'#634b36');rect(x+bw/2-2,y+bh-13,2,3,'#e7c27d');rect(x-8,y+bh+6,bw+16,20,'#332e28');text(label,x+bw/2,y+bh+20,11,'#f2d7a1','center');}
 function town(){
  if(townArt.complete&&townArt.naturalWidth){ctx.drawImage(townArt,0,75,w,h-75);
   const townPort=PORTS.find(p=>Math.hypot(p.x-state.ship.x,p.z-state.ship.z)<5)||PORTS[0];
   const shades={'영국 왕실':'#284c6750','포르투갈 상단':'#86602b44','북해 상인연맹':'#4b72824b','프랑스 항구동맹':'#526b9450','이베리아 왕실':'#9a76424a','지중해 공화국':'#81704b44'};
   rect(0,75,w,h-75,shades[townPort.faction]||'#55726a40');
   rect(0,75,w,48,'#162e37cd');text(townPort.name+' 항구 · '+townPort.region,w/2,97,15,'#ffe4aa','center');text(townPort.faction+' | 1590',w/2,113,10,'#e4caa7','center');
   hit=[];for(const [id,label,px,py,color] of cityPlaces()){const x=w*px,y=75+(h-75)*py;rect(x-52,y,104,21,'#2b2c2de8');text(label,x,y+14,11,C.gold,'center');hit.push({x:x-64,y:y-(h-75)*.15,w:128,h:(h-75)*.19,building:id});}rect(w/2-122,128,244,22,'#263335cb');text('교역 · 선술집 · 조선소 · 왕궁',w/2,144,11,C.gold,'center');return;}
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
  const mx=landscape?w/2-mw/2:w-mw-8,my=landscape?h-mh-12:h-(canvas.clientHeight<700?255:290);
  const miniScale=landscape?.15:.20,key=mw+':'+mh+':'+state.charted.length;
  if(miniKey!==key){miniLayer.width=mw;miniLayer.height=mh;miniCtx.imageSmoothingEnabled=false;drawGeography(miniCtx,mw,mh,75,-550,miniScale);drawFog(miniCtx,mw,mh,75,-550,miniScale,state.charted);miniKey=key;}
  ctx.save();ctx.translate(mx,my);ctx.drawImage(miniLayer,0,0);
  ctx.strokeStyle='#ebd3a1';ctx.strokeRect(0,0,mw,mh);
  const x=mw/2+(state.ship.x-75)*miniScale,y=mh/2+(state.ship.z+550)*miniScale;
  ctx.fillStyle='#fff3b6';ctx.fillRect(x-3,y-3,6,6);
  if(state.destination){const p=PORTS.find(p=>p.id===state.destination);if(p){ctx.fillStyle='#f49367';ctx.fillRect(mw/2+(p.x-75)*miniScale-2,mh/2+(p.z+550)*miniScale-2,4,4);}}
  text('유럽 · 항로도',mw/2,mh+13,9,C.gold,'center');ctx.restore();
 }
 function render(now){if(destroyed)return;frame=requestAnimationFrame(render);if(now-last<(quality==='low'?50:20))return;last=now;time=now/1000;
 const width=Math.min(560,Math.max(320,Math.round(canvas.clientWidth/1.4))),height=Math.round(width*canvas.clientHeight/canvas.clientWidth);if(w!==width||h!==height){w=width;h=height;canvas.width=w;canvas.height=h;}ctx.imageSmoothingEnabled=false;if(!state)return;ctx.save();const impactAge=(performance.now()-fxStarted)/1000;if(impactAge<.45&&state.combatFx&&['cannon','skill','slash'].includes(state.combatFx.type))ctx.translate(Math.round(Math.sin(impactAge*90)*(1-impactAge/.45)*4),Math.round(Math.cos(impactAge*73)*(1-impactAge/.45)*3));mode==='battle'?landScene():mode==='sea'?sea():facility?interior():town();weatherOverlay();drawImpact();if(mode==='sea')minimap();ctx.restore();}
 canvas.addEventListener('click',e=>{const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*w,y=(e.clientY-r.top)/r.height*h;const target=hit.find(b=>x>=b.x&&x<=b.x+b.w&&y>=b.y&&y<=b.y+b.h);if(mode==='town'&&!facility&&target?.building)onBuilding(target.building);if(mode==='sea'&&target?.port)onPort(target.port);if(mode==='sea'&&target?.merchant)onMerchant(target.merchant);});
 frame=requestAnimationFrame(render);queueMicrotask(onReady);
 return {setState(s){state=s;if(s.combatFx?.serial&&s.combatFx.serial!==lastFxSerial){lastFxSerial=s.combatFx.serial;fxStarted=performance.now();}},setMode(next,room=''){mode=next;facility=room;hit=[];},setQuality(v){quality=v;},setZoom(v){zoom=Math.max(.35,Math.min(16,Number(v)||4.8));},getZoom(){return zoom;},dispose(){destroyed=true;cancelAnimationFrame(frame);}};
}
