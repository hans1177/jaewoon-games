// Survival2 Flare packed-sprite compatibility layer.
// Flare fantasycore avatar PNGs are packed atlases, not 128px grids.
(function(){
'use strict';
const proto=CanvasRenderingContext2D.prototype,nativeDraw=proto.drawImage;
const frames={
 'male/default_legs.png':[147,242,69,77,21,72],
 'male/default_chest.png':[1154,218,80,106,30,115],
 'male/head_short.png':[638,458,71,108,7,133],
 'female/default_legs.png':[175,397,56,82,13,84],
 'female/default_chest.png':[1029,324,70,107,18,120],
 'female/head_long.png':[675,349,68,116,9,141]
};
proto.drawImage=function(img,...a){
 const src=String(img&&img.src||'');
 if(src.includes('/flareteam/flare-game/')&&src.includes('/images/avatar/')&&a.length===8&&a[0]===0&&a[1]===512&&a[2]===128&&a[3]===128){
   // Hands/feet are intentionally omitted in the compact mobile render; legs/chest/head form a clean full-body silhouette.
   const key=Object.keys(frames).find(k=>src.includes(k));
   if(!key)return;
   const [sx,sy,sw,sh,ox,oy]=frames[key],dx=a[4],dy=a[5],out=a[6];
   const anchorX=dx+out/2,anchorY=dy+out*.88,k=out/160;
   return nativeDraw.call(this,img,sx,sy,sw,sh,Math.round(anchorX-ox*k),Math.round(anchorY-oy*k),Math.round(sw*k),Math.round(sh*k));
 }
 return nativeDraw.call(this,img,...a);
};
})();
