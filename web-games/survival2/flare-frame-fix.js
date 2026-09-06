// Flare packed-avatar frame adapter for Survival2.
// Flare compressed frames are variable rectangles with per-frame anchor offsets.
(function(){
'use strict';
const RAW='https://raw.githubusercontent.com/flareteam/flare-game/master/mods/fantasycore/';
const files=['default_legs','default_feet','default_chest','default_hands','head_short','head_long'];
const meta=new Map();
function key(gender,name){return gender+'/'+name.replace(/\.png$/,'');}
function parse(text){
 const frames=new Map();let section='';
 for(const raw of text.split(/\r?\n/)){
  const line=raw.trim();
  const sec=line.match(/^\[([^\]]+)\]$/);if(sec){section=sec[1];continue;}
  if(section!=='stance')continue;
  const m=line.match(/^frame=(\d+),(\d+),(\d+),(\d+),(\d+),(\d+),(\d+),(\d+)/);
  if(m)frames.set(m[1]+','+m[2],m.slice(3).map(Number));
 }
 return frames;
}
async function load(gender,name){
 try{const r=await fetch(RAW+'animations/avatar/'+gender+'/'+name+'.txt',{cache:'force-cache'});if(r.ok)meta.set(key(gender,name),parse(await r.text()));}catch(_){ }
}
for(const gender of ['male','female'])for(const name of files){if((gender==='male'&&name==='head_long')||(gender==='female'&&name==='head_short'))continue;load(gender,name);}
const native=CanvasRenderingContext2D.prototype.drawImage;
CanvasRenderingContext2D.prototype.drawImage=function(img,...a){
 try{
  const src=String(img&&img.src||'');
  if(src.includes('/mods/fantasycore/images/avatar/')&&a.length===8&&a[2]===128&&a[3]===128){
   const m=src.match(/\/avatar\/(male|female)\/([^/?#]+)\.png/);
   if(m){const frames=meta.get(key(m[1],m[2]));const f=frames&&frames.get('0,4');if(f){
    const [sx,sy,sw,sh,ox,oy]=f;
    const dx=a[4],dy=a[5],dw=a[6];
    const scale=dw/128;
    const anchorX=dx+dw/2,groundY=dy+dw*.88;
    return native.call(this,img,sx,sy,sw,sh,Math.round(anchorX-ox*scale),Math.round(groundY-oy*scale),Math.round(sw*scale),Math.round(sh*scale));
   }}
  }
 }catch(_){ }
 return native.call(this,img,...a);
};
})();
