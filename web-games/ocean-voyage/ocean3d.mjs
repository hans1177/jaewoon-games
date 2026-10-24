// 파일명: ocean3d.mjs · 기존 장면 책임 파일을 픽셀 해도·항구·시설 렌더러로 교체
// 임포트: 실제 해안선과 게임 규칙 공유. 저장·경제 규칙은 엔진이 담당한다.
import {PORTS,SHIP_TYPES,portStatus,SITES,CREW} from './engine.mjs';
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
export function createOceanView(canvas,{onReady=()=>{},onError=()=>{},onBuilding=()=>{},onPort=()=>{}}={}){
 const ctx=canvas.getContext('2d',{alpha:false});if(!ctx){onError('해도를 그릴 수 없어. 브라우저를 다시 열어줘.');return {setState(){},setMode(){},setQuality(){},setZoom(){}};}
 const townArt=new Image();townArt.src='./assets/harbor.webp';
 let fxStarted=0,lastFxSerial=0;
 let state=null,mode='sea',facility='',frame=0,last=0,zoom=4.8,quality='pixel',destroyed=false,hit=[],time=0,w=480,h=720;
 const rect=(x,y,a,b,c)=>{ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),Math.round(a),Math.round(b));};
 function text(t,x,y,size=11,color=C.gold,align='left'){ctx.font=`bold ${size}px system-ui`;ctx.fillStyle=color;ctx.textAlign=align;ctx.fillText(t,Math.round(x),Math.round(y));ctx.textAlign='left';}
 function ship(x,y,heading,type='caravel',enemy=false,scale=1,ports=6){
  const design=SHIP_TYPES.find(t=>t.id===type)||SHIP_TYPES[0],rig=design.rig||(type==='caravel'?'lateen':'square');
  ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.rotate(Math.PI-heading);ctx.scale(scale*(design.width||1),scale*(design.length||1));
  rect(-7,-13,14,28,'#172d35');rect(-6,-11,12,25,enemy?'#663934':'#835b38');rect(-4,-17,8,8,'#bb9560');rect(-1,-12,2,27,'#493b30');
  if(rig==='oars'){for(let i=0;i<7;i++){rect(-15,-9+i*3,9,1,'#c4a573');rect(6,-9+i*3,9,1,'#c4a573');}}
  const sails=type==='galleon'||type.includes('galleon')||type.includes('fluyt')||type.includes('racer')?3:rig==='oars'?1:2;
  for(let i=0;i<sails;i++){const sy=-9+i*9;if(rig==='lateen'||rig==='oars'||!enemy&&type===state.shipType&&state.ship.gear.sail==='lateen'&&i===sails-1){ctx.fillStyle=enemy?'#575358':'#eee1b8';ctx.beginPath();ctx.moveTo(0,sy-4);ctx.lineTo(-12,sy+8);ctx.lineTo(9,sy+7);ctx.closePath();ctx.fill();rect(-12,sy+8,22,1,'#8f8c6b');}else{rect(-11,sy,22,6,enemy?'#575358':'#eee1b8');rect(-10,sy+5,20,2,enemy?'#393d43':'#b3b99e');rect(-13,sy,26,1,'#674a36');}}
  if(type.includes('galleon')||type.includes('fluyt')){rect(-7,9,14,8,'#af8951');rect(-5,12,10,3,design.color||'#69553e');}
  for(let i=0;i<Math.ceil(Math.min(20,ports)/2);i++){rect(-9,-10+i*3,4,2,'#252f33');rect(5,-10+i*3,4,2,'#252f33');}
  if(!enemy&&type===state.shipType&&state.ship.gear.figurehead!=='none'){const symbol=state.ship.gear.figurehead;rect(-3,-23,6,6,'#e4c078');if(symbol==='lion'){rect(-5,-24,3,7,'#b88c43');rect(2,-24,3,7,'#b88c43');}if(symbol==='dolphin'){rect(1,-27,6,3,'#8ebac1');rect(-4,-21,4,3,'#8ebac1');}if(symbol==='mermaid'){rect(-2,-27,4,4,'#efd4a2');rect(-4,-19,8,3,'#7ead9e');}if(symbol==='owl'){rect(-4,-27,2,5,'#e4c078');rect(2,-27,2,5,'#e4c078');rect(-2,-22,1,1,'#2e3031');rect(2,-22,1,1,'#2e3031');}}
  rect(0,-18,8,3,enemy?'#b8634f':design.color||'#ce8c58');ctx.restore();
 }

 function sea(){
  const cx=state.ship.x,cz=state.ship.z;drawGeography(ctx,w,h,cx,cz,zoom);drawFog(ctx,w,h,cx,cz,zoom,state.charted);
  ctx.globalAlpha=.15;for(let i=0;i<35;i++){const x=(i*83+Math.floor(time*3))%w,y=(i*47)%h;rect(x,y,9,1,'#c1e1d5');rect(x+3,y+2,6,1,'#c1e1d5');}ctx.globalAlpha=1;
  const x=v=>w/2+(v-cx)*zoom,z=v=>h/2+(v-cz)*zoom;
  ctx.strokeStyle='#e5ce87';ctx.setLineDash([3,4]);ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(w/2,h/2);for(const p of state.route||[])ctx.lineTo(x(p.x),z(p.z));ctx.stroke();ctx.setLineDash([]);
  hit=[];for(const p of PORTS){if(!state.discovered.includes(p.id))continue;const px=x(p.x),py=z(p.z);if(px<-30||px>w+30||py<70||py>h-80)continue;rect(px-4,py-4,8,8,'#332e2a');rect(px-2,py-2,4,4,state.discovered.includes(p.id)?'#ffd48a':'#b2bdba');text(p.name,px,py-10,11,'#fff0cb','center');hit.push({x:px-24,y:py-26,w:48,h:48,port:p.id});}
  for(const p of state.pirates)if(p.hull>0&&state.charted.includes(Math.floor(p.x/24)+':'+Math.floor(p.z/24))){ship(x(p.x),z(p.z),p.heading,'galleon',true,.65);}
  if(state.fleet>=2)ship(w/2-24,h/2+25,state.ship.heading,'cog',false,.7);
  if(state.fleet>=3)ship(w/2+24,h/2+28,state.ship.heading,'galleon',false,.7);
  ship(w/2,h/2,state.ship.heading,state.shipType,false,.9,state.ship.cannons);
  const pulse=Math.sin(time*3)*2;ctx.strokeStyle='#c8e4df88';ctx.beginPath();ctx.arc(w/2,h/2,21+pulse,0,Math.PI*2);ctx.stroke();
  text('북',w-25,102,12);rect(w-26,109,2,23,C.gold);text('↑',w-25,119,14,C.gold,'center');
  text('실제 해안선 · 국가 경계는 위치 참고선',w/2,h-155,9,'#cee1d5','center');
 }
 const places=[['market','교역소',.18,.35,'#9d6750'],['fleet','조선소',.77,.63,'#596f70'],['crew','선술집',.22,.60,'#ae7546'],['palace','왕궁 · 총독부',.72,.29,'#726b8d'],['quests','탐험가 사무실',.72,.47,'#497c72'],['jobs','직업 길드',.25,.79,'#74694a']];
 function building(x,y,bw,bh,label,color){rect(x-3,y+bh-2,bw+6,6,'#493d2f');rect(x,y,bw,bh,'#d0b78b');rect(x-5,y-12,bw+10,14,color);rect(x+2,y-19,bw-4,9,color);rect(x+7,y+10,13,13,'#3e5960');rect(x+bw-20,y+10,13,13,'#3e5960');rect(x+bw/2-7,y+bh-23,14,23,'#634b36');rect(x+bw/2-2,y+bh-13,2,3,'#e7c27d');rect(x-8,y+bh+6,bw+16,20,'#332e28');text(label,x+bw/2,y+bh+20,11,'#f2d7a1','center');}
 function town(){
  if(townArt.complete&&townArt.naturalWidth){ctx.drawImage(townArt,0,75,w,h-75);hit=[];for(const [id,label,px,py,color] of places){const row=id==='market'||id==='palace'?0:id==='crew'||id==='quests'?1:2,x=w*(px<.5?.23:.77),y=75+(h-75)*[.25,.455,.65][row];rect(x-52,y,104,21,'#2b2c2de8');text(label,x,y+14,11,C.gold,'center');hit.push({x:x-64,y:y-(h-75)*.15,w:128,h:(h-75)*.19,building:id});}const p=PORTS.find(p=>Math.hypot(p.x-state.ship.x,p.z-state.ship.z)<4);rect(w/2-100,91,200,25,'#263335de');text((p?.name||'항구')+' · 시설을 눌러 들어가',w/2,108,12,C.gold,'center');return;}
  rect(0,0,w,h,'#7c8b68');for(let y=90;y<h;y+=16)for(let x=0;x<w;x+=16)rect(x+((y/16)%2?8:0),y,2,2,'#657c5b');
  rect(w*.41,105,w*.19,h-140,'#b6a27a');rect(0,h*.49,w,h*.09,'#b6a27a');
  for(let y=110;y<h-90;y+=12){rect(w*.44,y,15,1,'#8f815e');rect(w*.53,y+5,16,1,'#d0b88b');}
  rect(0,h-135,w,135,C.sea);rect(w*.4,h-143,w*.2,82,'#78573b');for(let y=h-140;y<h-65;y+=8)rect(w*.4,y,w*.2,1,'#bd9666');ship(w*.5,h-56,0,state.shipType,false,1.1);
  hit=[];for(const [id,label,px,py,color] of places){const bw=Math.min(96,w*.27),bh=45,row=id==='market'||id==='palace'?0:id==='crew'||id==='quests'?1:2,x=w*(px<.5?.23:.77)-bw/2,y=150+Math.max(190,h-370)*row/2;building(x,y,bw,bh,label,color);hit.push({x:x-8,y:y-23,w:bw+16,h:bh+55,building:id});}
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
  if(seaFx){if(mode!=='sea')return;const x=v=>w/2+(v-state.ship.x)*zoom,z=v=>h/2+(v-state.ship.z)*zoom;at={x:x(fx.to.x),y:z(fx.to.z)};const from={x:x(fx.from.x),y:z(fx.from.z)},flight=Math.max(.08,Math.min(.5,Math.hypot(at.x-from.x,at.y-from.y)/(fx.speed||180)));if(age<flight){const ratio=age/flight,px=from.x+(at.x-from.x)*ratio,py=from.y+(at.y-from.y)*ratio;ctx.strokeStyle='#ffe4a2';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(px-(at.x-from.x)*.12,py-(at.y-from.y)*.12);ctx.lineTo(px,py);ctx.stroke();rect(px-2,py-2,fx.gun==='bombard'?6:4,fx.gun==='bombard'?6:4,'#fff1b1');return;}age-=flight;}
  else{if(mode!=='battle')return;at=unitPoint(fx.side||'enemy',fx.target||0);at.y-=18;}
  const fade=Math.max(0,1-age);
  ctx.save();ctx.globalAlpha=fade;
  if(fx.type==='heal'||fx.type==='guard'){ctx.strokeStyle=fx.type==='heal'?'#91f0b3':'#a2ddff';ctx.lineWidth=3;ctx.beginPath();ctx.arc(at.x,at.y,18+age*25,0,Math.PI*2);ctx.stroke();for(let i=0;i<6;i++){const x=at.x+Math.sin(i*2)*24,y=at.y+Math.cos(i*2)*20-age*24;rect(x-3,y,7,2,'#d0ffe2');rect(x,y-3,2,7,'#d0ffe2');}}
  else {if(age<.4){ctx.strokeStyle=fx.type==='skill'?'#fff3bd':'#fff0dc';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(at.x-25,at.y+23);ctx.lineTo(at.x+25,at.y-23);ctx.moveTo(at.x-17,at.y-22);ctx.lineTo(at.x+17,at.y+22);ctx.stroke();}for(let i=0;i<14;i++){const angle=i*2.399,r=12+age*65,x=at.x+Math.cos(angle)*r,y=at.y+Math.sin(angle)*r+age*age*25;rect(x,y,i%3?4:7,i%3?4:7,i%2?'#ffcd62':'#f98548');}if(seaFx){ctx.fillStyle='#e2d3ad';for(let i=0;i<5;i++){ctx.globalAlpha=fade*.5;ctx.beginPath();ctx.arc(at.x+Math.sin(i*3)*20,at.y-age*28+Math.cos(i)*12,8+age*16,0,Math.PI*2);ctx.fill();}}}
  ctx.globalAlpha=fade;text((fx.type==='heal'?'+':'−')+Math.round(fx.damage||0),at.x,at.y-25-age*25,20,fx.type==='heal'?'#c5ffcf':'#fff0b1','center');ctx.restore();
 }

 function weatherOverlay(){const weather=state.climate?.kind,phase=(state.elapsed||0)/16;if(phase>.72||phase<.12){ctx.fillStyle=phase>.72?'#081a4b45':'#d8a25a20';ctx.fillRect(0,0,w,h);}if(mode!=='sea')return;if(weather==='rain'||weather==='storm'){ctx.strokeStyle='#c5e1e455';ctx.lineWidth=1;ctx.beginPath();for(let i=0;i<(weather==='storm'?60:30);i++){const x=(i*83+time*23)%w,y=(i*73+time*110)%h;ctx.moveTo(x,y);ctx.lineTo(x-3,y+8);}ctx.stroke();}if(weather==='fog'){ctx.fillStyle='#bdccbf30';ctx.fillRect(0,0,w,h);}if(weather==='storm'){ctx.fillStyle='#15293f30';ctx.fillRect(0,0,w,h);}}
 function minimap(){const landscape=canvas.clientHeight<500,mw=landscape?94:128,mh=landscape?76:104,mx=landscape?w/2-mw/2:w-mw-8,my=landscape?h-mh-12:h-(canvas.clientHeight<700?255:290);ctx.save();ctx.translate(mx,my);const miniScale=landscape?.15:.20;drawGeography(ctx,mw,mh,75,-550,miniScale);drawFog(ctx,mw,mh,75,-550,miniScale,state.charted);ctx.strokeStyle='#ebd3a1';ctx.strokeRect(0,0,mw,mh);const x=mw/2+(state.ship.x-75)*miniScale,y=mh/2+(state.ship.z+550)*miniScale;ctx.fillStyle='#fff3b6';ctx.fillRect(x-2,y-2,4,4);if(state.destination){const p=PORTS.find(p=>p.id===state.destination);ctx.fillStyle='#f49367';ctx.fillRect(mw/2+(p.x-75)*miniScale-2,mh/2+(p.z+550)*miniScale-2,4,4);}text('유럽 · 현재 위치',mw/2,mh+13,9,C.gold,'center');ctx.restore();}
 function render(now){if(destroyed)return;frame=requestAnimationFrame(render);if(now-last<(quality==='low'?50:33))return;last=now;time=now/1000;
 const width=Math.min(560,Math.max(320,Math.round(canvas.clientWidth/1.4))),height=Math.round(width*canvas.clientHeight/canvas.clientWidth);if(w!==width||h!==height){w=width;h=height;canvas.width=w;canvas.height=h;}ctx.imageSmoothingEnabled=false;if(!state)return;ctx.save();const impactAge=(performance.now()-fxStarted)/1000;if(impactAge<.45&&state.combatFx&&['cannon','skill','slash'].includes(state.combatFx.type))ctx.translate(Math.round(Math.sin(impactAge*90)*(1-impactAge/.45)*4),Math.round(Math.cos(impactAge*73)*(1-impactAge/.45)*3));mode==='battle'?landScene():mode==='sea'?sea():facility?interior():town();weatherOverlay();drawImpact();if(mode==='sea')minimap();ctx.restore();}
 canvas.addEventListener('click',e=>{const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*w,y=(e.clientY-r.top)/r.height*h;const target=hit.find(b=>x>=b.x&&x<=b.x+b.w&&y>=b.y&&y<=b.y+b.h);if(mode==='town'&&!facility&&target?.building)onBuilding(target.building);if(mode==='sea'&&target?.port)onPort(target.port);});
 frame=requestAnimationFrame(render);queueMicrotask(onReady);
 return {setState(s){state=s;if(s.combatFx?.serial&&s.combatFx.serial!==lastFxSerial){lastFxSerial=s.combatFx.serial;fxStarted=performance.now();}},setMode(next,room=''){mode=next;facility=room;hit=[];},setQuality(v){quality=v;},setZoom(v){zoom=Math.max(.35,Math.min(16,Number(v)||4.8));},getZoom(){return zoom;},dispose(){destroyed=true;cancelAnimationFrame(frame);}};
}
