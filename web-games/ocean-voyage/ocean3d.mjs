// 파일명: ocean3d.mjs · 기존 장면 책임 파일을 픽셀 해도·항구·시설 렌더러로 교체
// 임포트: 실제 해안선과 게임 규칙 공유. 저장·경제 규칙은 엔진이 담당한다.
import {PORTS,SHIP_TYPES} from './engine.mjs';
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
export function drawFog(ctx,w,h,cx,cz,scale,charted){const known=new Set(charted),left=cx-w/2/scale,top=cz-h/2/scale;ctx.fillStyle='#071a2deB';for(let gx=Math.floor(left/24);gx<Math.ceil((left+w/scale)/24);gx++)for(let gz=Math.floor(top/24);gz<Math.ceil((top+h/scale)/24);gz++)if(!known.has(gx+':'+gz))ctx.fillRect(Math.floor(w/2+(gx*24-cx)*scale),Math.floor(h/2+(gz*24-cz)*scale),Math.ceil(24*scale)+1,Math.ceil(24*scale)+1);}
export function createOceanView(canvas,{onReady=()=>{},onError=()=>{},onBuilding=()=>{},onPort=()=>{}}={}){
 const ctx=canvas.getContext('2d',{alpha:false});if(!ctx){onError('해도를 그릴 수 없어. 브라우저를 다시 열어줘.');return {setState(){},setMode(){},setQuality(){},setZoom(){}};}
 let state=null,mode='sea',facility='',frame=0,last=0,zoom=4.8,quality='pixel',destroyed=false,hit=[],time=0,w=480,h=720;
 const rect=(x,y,a,b,c)=>{ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),Math.round(a),Math.round(b));};
 function text(t,x,y,size=11,color=C.gold,align='left'){ctx.font=`bold ${size}px system-ui`;ctx.fillStyle=color;ctx.textAlign=align;ctx.fillText(t,Math.round(x),Math.round(y));ctx.textAlign='left';}
 function ship(x,y,heading,type='caravel',enemy=false,scale=1){ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.rotate(Math.PI-heading);ctx.scale(scale,scale);rect(-7,-13,14,28,'#172d35');rect(-6,-11,12,25,enemy?'#663934':'#835b38');rect(-4,-17,8,8,'#bb9560');rect(-1,-12,2,27,'#493b30');const sails=type==='galleon'?3:type==='carrack'?3:type==='cog'?1:2;for(let i=0;i<sails;i++){const sy=-9+i*9;rect(-11,sy,22,6,enemy?'#575358':'#eee1b8');rect(-10,sy+5,20,2,enemy?'#393d43':'#b3b99e');rect(-13,sy,26,1,'#674a36');}rect(0,-18,8,3,enemy?'#b8634f':'#ce8c58');ctx.restore();}
 function sea(){
  const cx=state.ship.x,cz=state.ship.z;drawGeography(ctx,w,h,cx,cz,zoom);drawFog(ctx,w,h,cx,cz,zoom,state.charted);
  ctx.globalAlpha=.15;for(let i=0;i<35;i++){const x=(i*83+Math.floor(time*3))%w,y=(i*47)%h;rect(x,y,9,1,'#c1e1d5');rect(x+3,y+2,6,1,'#c1e1d5');}ctx.globalAlpha=1;
  const x=v=>w/2+(v-cx)*zoom,z=v=>h/2+(v-cz)*zoom;
  ctx.strokeStyle='#e5ce87';ctx.setLineDash([3,4]);ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(w/2,h/2);for(const p of state.route||[])ctx.lineTo(x(p.x),z(p.z));ctx.stroke();ctx.setLineDash([]);
  hit=[];for(const p of PORTS){if(!state.discovered.includes(p.id))continue;const px=x(p.x),py=z(p.z);if(px<-30||px>w+30||py<70||py>h-80)continue;rect(px-4,py-4,8,8,'#332e2a');rect(px-2,py-2,4,4,state.discovered.includes(p.id)?'#ffd48a':'#b2bdba');text(p.name,px,py-10,11,'#fff0cb','center');hit.push({x:px-24,y:py-26,w:48,h:48,port:p.id});}
  for(const p of state.pirates)if(p.hull>0&&state.charted.includes(Math.floor(p.x/24)+':'+Math.floor(p.z/24))){ship(x(p.x),z(p.z),p.heading,'galleon',true,.65);}
  if(state.fleet>=2)ship(w/2-24,h/2+25,state.ship.heading,'cog',false,.7);
  if(state.fleet>=3)ship(w/2+24,h/2+28,state.ship.heading,'galleon',false,.7);
  ship(w/2,h/2,state.ship.heading,state.shipType,false,.9);
  const pulse=Math.sin(time*3)*2;ctx.strokeStyle='#c8e4df88';ctx.beginPath();ctx.arc(w/2,h/2,21+pulse,0,Math.PI*2);ctx.stroke();
  text('북',w-25,102,12);rect(w-26,109,2,23,C.gold);text('↑',w-25,119,14,C.gold,'center');
  text('실제 해안선 · 국가 경계는 위치 참고선',w/2,h-155,9,'#cee1d5','center');
 }
 const places=[['market','교역소',.18,.35,'#9d6750'],['fleet','조선소',.77,.63,'#596f70'],['crew','선술집',.22,.60,'#ae7546'],['palace','왕궁 · 총독부',.72,.29,'#726b8d'],['quests','탐험가 사무실',.72,.47,'#497c72'],['jobs','직업 길드',.25,.79,'#74694a']];
 function building(x,y,bw,bh,label,color){rect(x-3,y+bh-2,bw+6,6,'#493d2f');rect(x,y,bw,bh,'#d0b78b');rect(x-5,y-12,bw+10,14,color);rect(x+2,y-19,bw-4,9,color);rect(x+7,y+10,13,13,'#3e5960');rect(x+bw-20,y+10,13,13,'#3e5960');rect(x+bw/2-7,y+bh-23,14,23,'#634b36');rect(x+bw/2-2,y+bh-13,2,3,'#e7c27d');rect(x-8,y+bh+6,bw+16,20,'#332e28');text(label,x+bw/2,y+bh+20,11,'#f2d7a1','center');}
 function town(){
  rect(0,0,w,h,'#7c8b68');for(let y=90;y<h;y+=16)for(let x=0;x<w;x+=16)rect(x+((y/16)%2?8:0),y,2,2,'#657c5b');
  rect(w*.41,105,w*.19,h-140,'#b6a27a');rect(0,h*.49,w,h*.09,'#b6a27a');
  for(let y=110;y<h-90;y+=12){rect(w*.44,y,15,1,'#8f815e');rect(w*.53,y+5,16,1,'#d0b88b');}
  rect(0,h-135,w,135,C.sea);rect(w*.4,h-143,w*.2,82,'#78573b');for(let y=h-140;y<h-65;y+=8)rect(w*.4,y,w*.2,1,'#bd9666');ship(w*.5,h-56,0,state.shipType,false,1.1);
  hit=[];for(const [id,label,px,py,color] of places){const bw=Math.min(96,w*.27),bh=45,row=id==='market'||id==='palace'?0:id==='crew'||id==='quests'?1:2,x=w*(px<.5?.23:.77)-bw/2,y=150+Math.max(190,h-370)*row/2;building(x,y,bw,bh,label,color);hit.push({x:x-8,y:y-23,w:bw+16,h:bh+55,building:id});}
  for(let i=0;i<7;i++){const x=w*.48+Math.sin(time*.2+i)*w*.12,y=150+(i*61)%(h-300);rect(x,y,5,5,'#dbb288');rect(x-1,y+5,7,8,['#704e47','#426271','#b18a51'][i%3]);rect(x,y+13,2,4,'#3c3930');rect(x+4,y+13,2,4,'#3c3930');}
  const p=PORTS.find(p=>Math.hypot(p.x-state.ship.x,p.z-state.ship.z)<4);text((p?.name||'항구')+' · 시설을 눌러 들어가',w/2,109,13,'#fff0cb','center');
 }
 function interior(){
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
 function minimap(){const mw=128,mh=104,mx=w-mw-8,my=h-290;ctx.save();ctx.translate(mx,my);drawGeography(ctx,mw,mh,75,-550,.20);drawFog(ctx,mw,mh,75,-550,.20,state.charted);ctx.strokeStyle='#ebd3a1';ctx.strokeRect(0,0,mw,mh);const x=64+(state.ship.x-75)*.20,y=52+(state.ship.z+550)*.20;ctx.fillStyle='#fff3b6';ctx.fillRect(x-2,y-2,4,4);if(state.destination){const p=PORTS.find(p=>p.id===state.destination);ctx.fillStyle='#f49367';ctx.fillRect(64+(p.x-75)*.20-2,52+(p.z+550)*.20-2,4,4);}text('유럽 · 현재 위치',64,mh+13,9,C.gold,'center');ctx.restore();}
 function render(now){if(destroyed)return;frame=requestAnimationFrame(render);if(now-last<(quality==='low'?50:33))return;last=now;time=now/1000;
 const width=Math.min(560,Math.max(320,Math.round(canvas.clientWidth/1.4))),height=Math.round(width*canvas.clientHeight/canvas.clientWidth);if(w!==width||h!==height){w=width;h=height;canvas.width=w;canvas.height=h;}ctx.imageSmoothingEnabled=false;if(!state)return;mode==='sea'?sea():facility?interior():town();if(mode==='sea')minimap();}
 canvas.addEventListener('click',e=>{const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*w,y=(e.clientY-r.top)/r.height*h;const target=hit.find(b=>x>=b.x&&x<=b.x+b.w&&y>=b.y&&y<=b.y+b.h);if(mode==='town'&&!facility&&target?.building)onBuilding(target.building);if(mode==='sea'&&target?.port)onPort(target.port);});
 frame=requestAnimationFrame(render);queueMicrotask(onReady);
 return {setState(s){state=s;},setMode(next,room=''){mode=next;facility=room;hit=[];},setQuality(v){quality=v;},setZoom(v){zoom=Math.max(.35,Math.min(16,Number(v)||4.8));},getZoom(){return zoom;},dispose(){destroyed=true;cancelAnimationFrame(frame);}};
}
