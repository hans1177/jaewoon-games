// Survival2 2.5D runtime integration.
// Gameplay, collision and save data stay in world X/Y; rendering is projected.
(function(){
'use strict';
const ELEVATION=1,CULL=180;
function project(x,y,z,camera,viewport){const dx=x-camera.x,dy=y-camera.y;return{x:(dx-dy)*.5+viewport.w*.5,y:(dx+dy)*.25+viewport.h*.52-z*ELEVATION};}
function depth(o){return (Number(o.x)||0)+(Number(o.y)||0)+(Number(o.z)||0)*.5+(Number(o.depthBias)||0);}
function visible(p,v,m=CULL){return p.x>-m&&p.y>-m&&p.x<v.w+m&&p.y<v.h+m;}
function shadow(ctx,p,w,a=.22){ctx.save();ctx.globalAlpha=a;ctx.fillStyle='#000';ctx.beginPath();ctx.ellipse(p.x,p.y,Math.max(12,w*.34),Math.max(5,w*.11),0,0,Math.PI*2);ctx.fill();ctx.restore();}
function diamond(ctx,p,w=192,h=96,fill='#244f38'){ctx.beginPath();ctx.moveTo(p.x,p.y-h/2);ctx.lineTo(p.x+w/2,p.y);ctx.lineTo(p.x,p.y+h/2);ctx.lineTo(p.x-w/2,p.y);ctx.closePath();ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle='#2f6146';ctx.globalAlpha=.38;ctx.stroke();ctx.globalAlpha=1;}
function install(){
 if(typeof world!=='function'||typeof s==='undefined'||typeof X==='undefined')return false;
 const camera={x:s.player?.x||2300,y:s.player?.y||2300};
 function drawAtlas(kind,p,size){const a=A[kind]||A.spark;shadow(X,p,size,kind==='tree'?.18:.22);X.drawImage(atlas,a[0],a[1],128,128,p.x-size/2,p.y-size,size,size);}
 function label(text,p,yOff){X.save();X.textAlign='center';X.font='800 12px system-ui,sans-serif';X.lineWidth=3;X.strokeStyle='#07140f';X.strokeText(text,p.x,p.y-yOff);X.fillStyle='#fff';X.fillText(text,p.x,p.y-yOff);X.restore();}
 function hpBar(e,p,size){const w=Math.max(42,size*.62),r=Math.max(0,Math.min(1,e.hp/e.maxHp));X.fillStyle='#241b1b';X.fillRect(p.x-w/2,p.y-size-12,w,6);X.fillStyle=e.boss?'#ffd66e':'#d94b4b';X.fillRect(p.x-w/2,p.y-size-12,w*r,6);}
 world=function(){
  const v={w:sw,h:sh};camera.x+=(s.player.x-camera.x)*.16;camera.y+=(s.player.y-camera.y)*.16;
  X.save();X.setTransform(dpr,0,0,dpr,0,0);X.fillStyle=night()?'#091b19':'#163b2b';X.fillRect(0,0,sw,sh);
  const spacing=192,rx=Math.ceil(sw/96)+5,ry=Math.ceil(sh/48)+5,cx=Math.round(camera.x/spacing),cy=Math.round(camera.y/spacing);
  for(let gy=-ry;gy<=ry;gy++)for(let gx=-rx;gx<=rx;gx++){const wx=(cx+gx)*spacing,wy=(cy+gy)*spacing;if(wx<0||wy<0||wx>W||wy>H)continue;const p=project(wx,wy,0,camera,v);if(visible(p,v,120))diamond(X,p,192,96,((cx+gx+cy+gy)&1)?'#214b35':'#28563c');}
  const q=[];
  for(const r of s.resources)if(r.alive)q.push({kind:r.type,x:r.x,y:r.y,size:r.type==='tree'?118:72});
  for(const b of s.housing){const k=b.type==='오두막'?'hut':b.type==='모닥불'?'campfire':b.type==='벽'?'wall':b.type==='감시탑'?'tower':'signal';q.push({kind:k,x:b.x,y:b.y,size:118,depthBias:8});}
  for(const n of s.npcs)q.push({kind:'companion',x:n.x,y:n.y,size:82,label:n.name});
  for(const e of s.enemies)if(e.hp>0)q.push({kind:e.type,x:e.x,y:e.y,size:e.boss?132:88,enemy:e,depthBias:4});
  q.push({kind:'player',x:s.player.x,y:s.player.y,size:88,player:true,depthBias:5});q.sort((a,b)=>depth(a)-depth(b));
  for(const o of q){const p=project(o.x,o.y,0,camera,v);if(!visible(p,v,o.size+80))continue;drawAtlas(o.kind,p,o.size);if(o.enemy)hpBar(o.enemy,p,o.size);if(o.label)label(o.label,p,o.size+10);if(o.player)label(s.name,p,o.size+9);}
  if(night()){X.fillStyle='rgba(3,9,18,.30)';X.fillRect(0,0,sw,sh);}X.restore();
 };
 window.Survival25D={project,depth,visible,camera};return true;
}
if(!install())addEventListener('load',install,{once:true});
})();
