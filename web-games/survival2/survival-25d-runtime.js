// Survival2 2.5D runtime integration.
// Gameplay, collision and save data stay in world X/Y; rendering is projected.
(function(){
'use strict';
const ELEVATION=1,CULL=180;
function project(x,y,z,camera,viewport){const dx=x-camera.x,dy=y-camera.y;return{x:(dx-dy)*.5+viewport.w*.5,y:(dx+dy)*.25+viewport.h*.52-z*ELEVATION};}
function depth(o){return (Number(o.x)||0)+(Number(o.y)||0)+(Number(o.z)||0)*.5+(Number(o.depthBias)||0);}
function visible(p,v,m=CULL){return p.x>-m&&p.y>-m&&p.x<v.w+m&&p.y<v.h+m;}
function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}
function shadow(ctx,p,w,a=.22){ctx.save();ctx.globalAlpha=a;ctx.fillStyle='#000';ctx.beginPath();ctx.ellipse(Math.round(p.x),Math.round(p.y),Math.max(12,w*.34),Math.max(5,w*.11),0,0,Math.PI*2);ctx.fill();ctx.restore();}
function diamond(ctx,p,w=192,h=96,fill='#244f38'){ctx.beginPath();ctx.moveTo(p.x,p.y-h/2);ctx.lineTo(p.x+w/2,p.y);ctx.lineTo(p.x,p.y+h/2);ctx.lineTo(p.x-w/2,p.y);ctx.closePath();ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle='#2f6146';ctx.globalAlpha=.28;ctx.stroke();ctx.globalAlpha=1;}
const realAssets={};
for(const [kind,file] of Object.entries({tree:'tree.png',rock:'rock.png',plant:'plant.png',mushroom:'mushroom.png'})){const img=new Image();img.src='./assets/'+file;realAssets[kind]=img;}
function install(){
 if(typeof world!=='function'||typeof s==='undefined'||typeof X==='undefined'||typeof A==='undefined'||typeof atlas==='undefined')return false;
 const camera={x:s.player?.x||2300,y:s.player?.y||2300};
 const originalSpawn=typeof spawnEnemy==='function'?spawnEnemy:null,originalUpdate=typeof update==='function'?update:null;
 function blockedSpawn(p){if(dist(p,s.player)<360)return true;for(const b of s.housing||[])if(dist(p,b)<150)return true;for(const e of s.enemies||[])if(e.hp>0&&dist(p,e)<110)return true;return false;}
 if(originalSpawn)spawnEnemy=function(type='wolf',boss=false){const before=s.enemies.length;originalSpawn(type,boss);const e=s.enemies[before];if(!e)return;for(let i=0;i<24&&blockedSpawn(e);i++){const a=Math.random()*Math.PI*2,r=420+Math.random()*420;e.x=clamp(s.player.x+Math.cos(a)*r,80,W-80);e.y=clamp(s.player.y+Math.sin(a)*r,80,H-80);}if(blockedSpawn(e)){e.x=clamp(s.player.x+520,80,W-80);e.y=clamp(s.player.y+320,80,H-80);}};
 function separateEnemies(){const es=(s.enemies||[]).filter(e=>e.hp>0);for(let i=0;i<es.length;i++)for(let j=i+1;j<es.length;j++){const a=es[i],b=es[j],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||.001,min=(a.boss||b.boss)?82:58;if(d>=min)continue;const push=(min-d)*.5,nx=dx/d,ny=dy/d;a.x=clamp(a.x-nx*push,35,W-35);a.y=clamp(a.y-ny*push,35,H-35);b.x=clamp(b.x+nx*push,35,W-35);b.y=clamp(b.y+ny*push,35,H-35);}for(const e of es){for(const b of s.housing||[]){const dx=e.x-b.x,dy=e.y-b.y,d=Math.hypot(dx,dy)||.001,min=86;if(d<min){e.x=clamp(e.x+dx/d*(min-d),35,W-35);e.y=clamp(e.y+dy/d*(min-d),35,H-35);}}}}
 if(originalUpdate)update=function(dt){originalUpdate(dt);separateEnemies();};
 function drawSprite(kind,p,size){const real=realAssets[kind];shadow(X,p,size,kind==='tree'?.17:.22);const dx=Math.round(p.x-size/2),dy=Math.round(p.y-size);if(real&&real.complete&&real.naturalWidth){X.drawImage(real,dx,dy,size,size);return;}const a=A[kind]||A.spark;X.drawImage(atlas,a[0],a[1],128,128,dx,dy,size,size);}
 function label(text,p,yOff){X.save();X.textAlign='center';X.textBaseline='bottom';X.font='800 12px system-ui,sans-serif';X.lineWidth=3;X.strokeStyle='#07140f';X.strokeText(text,Math.round(p.x),Math.round(p.y-yOff));X.fillStyle='#fff';X.fillText(text,Math.round(p.x),Math.round(p.y-yOff));X.restore();}
 function hpBar(e,p,size){const w=Math.max(42,size*.62),r=Math.max(0,Math.min(1,e.hp/e.maxHp)),x=Math.round(p.x-w/2),y=Math.round(p.y-size-12);X.fillStyle='#241b1b';X.fillRect(x,y,w,6);X.fillStyle=e.boss?'#ffd66e':'#d94b4b';X.fillRect(x,y,Math.round(w*r),6);}
 world=function(){
  const v={w:sw,h:sh};camera.x+=(s.player.x-camera.x)*.16;camera.y+=(s.player.y-camera.y)*.16;
  X.save();X.setTransform(dpr,0,0,dpr,0,0);X.imageSmoothingEnabled=true;X.fillStyle=night()?'#091b19':'#163b2b';X.fillRect(0,0,sw,sh);
  const spacing=192,rx=Math.ceil(sw/96)+5,ry=Math.ceil(sh/48)+5,cx=Math.round(camera.x/spacing),cy=Math.round(camera.y/spacing);
  for(let gy=-ry;gy<=ry;gy++)for(let gx=-rx;gx<=rx;gx++){const wx=(cx+gx)*spacing,wy=(cy+gy)*spacing;if(wx<0||wy<0||wx>W||wy>H)continue;const p=project(wx,wy,0,camera,v);if(visible(p,v,120))diamond(X,p,192,96,((cx+gx+cy+gy)&1)?'#214b35':'#28563c');}
  const q=[];
  for(const r of s.resources)if(r.alive)q.push({kind:r.type,x:r.x,y:r.y,size:r.type==='tree'?112:r.type==='rock'?68:64});
  for(const b of s.housing){const k=b.type==='오두막'?'hut':b.type==='모닥불'?'campfire':b.type==='벽'?'wall':b.type==='감시탑'?'tower':'signal';q.push({kind:k,x:b.x,y:b.y,size:112,depthBias:8});}
  for(const n of s.npcs)q.push({kind:'companion',x:n.x,y:n.y,size:78,label:n.name});
  for(const e of s.enemies)if(e.hp>0)q.push({kind:e.type,x:e.x,y:e.y,size:e.boss?124:82,enemy:e,depthBias:4});
  q.push({kind:'player',x:s.player.x,y:s.player.y,size:82,player:true,depthBias:5});q.sort((a,b)=>depth(a)-depth(b));
  for(const o of q){const p=project(o.x,o.y,0,camera,v);if(!visible(p,v,o.size+80))continue;drawSprite(o.kind,p,o.size);if(o.enemy)hpBar(o.enemy,p,o.size);if(o.label)label(o.label,p,o.size+10);if(o.player)label(s.name,p,o.size+9);}
  if(night()){X.fillStyle='rgba(3,9,18,.30)';X.fillRect(0,0,sw,sh);}X.restore();
 };
 window.Survival25D={project,depth,visible,camera,realAssets};return true;
}
let tries=0;function boot(){if(install())return;if(++tries<80)setTimeout(boot,50);}boot();
})();
