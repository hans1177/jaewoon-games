// 파일명: web-games/survival2/survival-25d-runtime.js
// 그래픽: 선택한 3번 아이소메트릭 클래식 히어로 원본 PNG 적용 / 2.5D 월드 유지
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
const animalBase='https://raw.githubusercontent.com/eturner58/game-assets/main/kenney/2D%20assets/Animal%20Pack%20Remastered/PNG/Round/';
for(const [kind,file] of Object.entries({wolf:'dog.png',boar:'pig.png',guardian:'bear.png'})){const img=new Image();img.crossOrigin='anonymous';img.src=animalBase+file;realAssets[kind]=img;}
// 1번: 2DPIXX Warrior / 2번: FLARE Hero & Heroine / 3번: Isometric Classic Hero + Tiles / 4번: Isometric Painted Game Assets
// 선택 적용: 3번 원본 PNG, CC0. 출처: https://opengameart.org/content/isometric-classic-hero-tiles-32x32
const characterSheet=new Image();
characterSheet.crossOrigin='anonymous';
characterSheet.referrerPolicy='no-referrer';
characterSheet.src='https://raw.githubusercontent.com/rlong12135/notima/28c5e2f38425e698fe70708da8bd8bd47ad09519/assets/public-domain/isometric_hero_dezrasdragons.png';
const characterFrames={
 player:{sx:0,sy:0,sw:32,sh:32},
 companion:{sx:0,sy:0,sw:32,sh:32}
};
function sheetSprite(kind,p,size){
 const c=characterFrames[kind],iw=characterSheet.naturalWidth,ih=characterSheet.naturalHeight;
 if(!c||!ready(characterSheet)||!iw||!ih)return false;
 const sx=Math.max(0,Math.min(iw-c.sw,c.sx)),sy=Math.max(0,Math.min(ih-c.sh,c.sy));
 const dh=Math.round(size),dw=Math.round(dh*(c.sw/c.sh));
 X.drawImage(characterSheet,sx,sy,c.sw,c.sh,Math.round(p.x-dw/2),Math.round(p.y-dh),dw,dh);
 return true;
}

const defaultBuildingProfiles={hut:{scale:1.18,yOffset:2,shadow:1.08},wall:{scale:.88,yOffset:5,shadow:.86},tower:{scale:1.34,yOffset:1,shadow:1.05},signal:{scale:1.22,yOffset:2,shadow:.96},campfire:{scale:.72,yOffset:1,shadow:.62}};
function ready(img){return !!(img&&img.complete&&img.naturalWidth);}
function install(){
 if(typeof world!=='function'||typeof s==='undefined'||typeof X==='undefined'||typeof A==='undefined'||typeof atlas==='undefined')return false;
 const camera={x:s.player?.x||2300,y:s.player?.y||2300};
 const originalSpawn=typeof spawnEnemy==='function'?spawnEnemy:null,originalUpdate=typeof update==='function'?update:null;
 function blockedSpawn(p){if(dist(p,s.player)<360)return true;for(const b of s.housing||[])if(dist(p,b)<150)return true;for(const e of s.enemies||[])if(e.hp>0&&dist(p,e)<110)return true;return false;}
 if(originalSpawn)spawnEnemy=function(type='wolf',boss=false){const before=s.enemies.length;originalSpawn(type,boss);const e=s.enemies[before];if(!e)return;for(let i=0;i<24&&blockedSpawn(e);i++){const a=Math.random()*Math.PI*2,r=420+Math.random()*420;e.x=clamp(s.player.x+Math.cos(a)*r,80,W-80);e.y=clamp(s.player.y+Math.sin(a)*r,80,H-80);}if(blockedSpawn(e)){e.x=clamp(s.player.x+520,80,W-80);e.y=clamp(s.player.y+320,80,H-80);}};
 function separateEnemies(){const es=(s.enemies||[]).filter(e=>e.hp>0);for(let i=0;i<es.length;i++)for(let j=i+1;j<es.length;j++){const a=es[i],b=es[j],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||.001,min=(a.boss||b.boss)?82:58;if(d>=min)continue;const push=(min-d)*.5,nx=dx/d,ny=dy/d;a.x=clamp(a.x-nx*push,35,W-35);a.y=clamp(a.y-ny*push,35,W-35);b.x=clamp(b.x+nx*push,35,W-35);b.y=clamp(b.y+ny*push,35,W-35);}for(const e of es)for(const b of s.housing||[]){const dx=e.x-b.x,dy=e.y-b.y,d=Math.hypot(dx,dy)||.001,min=86;if(d<min){e.x=clamp(e.x+dx/d*(min-d),35,W-35);e.y=clamp(e.y+dy/d*(min-d),35,H-35);}}}
 if(originalUpdate)update=function(dt){originalUpdate(dt);separateEnemies();};
 function atlasSprite(kind,p,size){const a=A[kind]||A.spark;X.drawImage(atlas,a[0],a[1],128,128,Math.round(p.x-size/2),Math.round(p.y-size),size,size);}
 function buildingProfile(kind){return (window.Survival25D?.buildingProfiles&&window.Survival25D.buildingProfiles[kind])||defaultBuildingProfiles[kind]||null;}
 function drawSprite(kind,p,size){const profile=buildingProfile(kind),drawSize=profile?Math.round(size*(profile.scale||1)):size,drawP=profile?{x:p.x,y:p.y+(profile.yOffset||0)}:p;shadow(X,drawP,drawSize*(profile?.shadow||1),kind==='tree'?.17:.22);
  if(kind==='player'||kind==='companion'){
   if(!sheetSprite(kind,drawP,drawSize))atlasSprite(kind,drawP,drawSize);
   return;
  }
  const real=realAssets[kind],dx=Math.round(drawP.x-drawSize/2),dy=Math.round(drawP.y-drawSize);
  if(ready(real)){X.drawImage(real,dx,dy,drawSize,drawSize);return;}
  atlasSprite(kind,drawP,drawSize);
 }
 const labelSlots=[];function resetLabels(){labelSlots.length=0;}
 function label(text,p,yOff){let px=Math.round(p.x),py=Math.round(p.y-yOff);for(let pass=0;pass<5;pass++){let hit=false;for(const r of labelSlots){if(Math.abs(px-r.x)<64&&Math.abs(py-r.y)<17){py-=18;hit=true;break;}}if(!hit)break;}labelSlots.push({x:px,y:py});X.save();X.textAlign='center';X.textBaseline='bottom';X.font='800 12px system-ui,sans-serif';X.lineWidth=3;X.strokeStyle='#07140f';X.strokeText(text,px,py);X.fillStyle='#fff';X.fillText(text,px,py);X.restore();}
 function hpBar(e,p,size){const w=Math.max(42,size*.62),r=Math.max(0,Math.min(1,e.hp/e.maxHp)),px=Math.round(p.x-w/2),py=Math.round(p.y-size-12);X.fillStyle='#241b1b';X.fillRect(px,py,w,6);X.fillStyle=e.boss?'#ffd66e':'#d94b4b';X.fillRect(px,py,Math.round(w*r),6);}
 function tuneMobileUi(){const narrow=innerWidth<760,root=document.documentElement;root.style.setProperty('--survival-safe-bottom','max(18px, env(safe-area-inset-bottom))');const menu=document.querySelector('.menu'),joyEl=document.querySelector('.joy'),attackEl=document.querySelector('.attack');if(menu){menu.style.top=narrow?'116px':'70px';menu.style.right='max(8px, env(safe-area-inset-right))';menu.style.maxHeight=narrow?'46vh':'';menu.style.overflowY=narrow?'auto':'';}if(joyEl){joyEl.style.left='max(16px, env(safe-area-inset-left))';joyEl.style.bottom='var(--survival-safe-bottom)';if(narrow){joyEl.style.width='116px';joyEl.style.height='116px';}}if(attackEl){attackEl.style.right='max(14px, env(safe-area-inset-right))';attackEl.style.bottom='var(--survival-safe-bottom)';if(narrow){attackEl.style.width='104px';attackEl.style.height='60px';}}}
 tuneMobileUi();addEventListener('resize',tuneMobileUi,{passive:true});
 world=function(){const v={w:sw,h:sh},narrow=sw<760;camera.x+=(s.player.x-camera.x)*.16;camera.y+=(s.player.y-camera.y)*.16;X.save();X.setTransform(dpr,0,0,dpr,0,0);X.imageSmoothingEnabled=false;X.fillStyle=night()?'#091b19':'#163b2b';X.fillRect(0,0,sw,sh);const spacing=192,rx=Math.ceil(sw/96)+5,ry=Math.ceil(sh/48)+5,cx=Math.round(camera.x/spacing),cy=Math.round(camera.y/spacing);for(let gy=-ry;gy<=ry;gy++)for(let gx=-rx;gx<=rx;gx++){const wx=(cx+gx)*spacing,wy=(cy+gy)*spacing;if(wx<0||wy<0||wx>W||wy>H)continue;const p=project(wx,wy,0,camera,v);if(visible(p,v,120))diamond(X,p,192,96,((cx+gx+cy+gy)&1)?'#214b35':'#28563c');}
  const q=[];for(const r of s.resources||[])if(r.alive)q.push({kind:r.type,x:r.x,y:r.y,size:r.type==='tree'?112:r.type==='rock'?68:64});for(const b of s.housing||[]){const k=b.type==='오두막'?'hut':b.type==='모닥불'?'campfire':b.type==='벽'?'wall':b.type==='감시탑'?'tower':'signal';q.push({kind:k,x:b.x,y:b.y,size:112,depthBias:8});}for(const n of s.npcs||[])q.push({kind:'companion',x:n.x,y:n.y,size:82,label:n.name});for(const e of s.enemies||[])if(e.hp>0)q.push({kind:e.type,x:e.x,y:e.y,size:e.boss?124:82,enemy:e,depthBias:4});q.push({kind:'player',x:s.player.x,y:s.player.y,size:88,player:true,depthBias:5});q.sort((a,b)=>depth(a)-depth(b));resetLabels();for(const o of q){const p=project(o.x,o.y,0,camera,v);if(narrow)p.y-=18;if(!visible(p,v,o.size+80))continue;drawSprite(o.kind,p,o.size);if(o.enemy)hpBar(o.enemy,p,o.size);if(o.label)label(o.label,p,o.size+10);if(o.player)label(s.name||'생존자',p,o.size+12);}X.restore();};
 window.Survival25D=Object.assign(window.Survival25D||{},{installed:true,characterSource:'https://raw.githubusercontent.com/rlong12135/notima/28c5e2f38425e698fe70708da8bd8bd47ad09519/assets/public-domain/isometric_hero_dezrasdragons.png',project,depth});
 return true;
}
let tries=0;function boot(){if(install())return;if(++tries<120)setTimeout(boot,50);}boot();
})();
