// Survival2 CC0 2.5D building asset layer.
// Source: Kenney Isometric Tiles Buildings (CC0).
(function(){
'use strict';
// Flare fantasycore uses packed sprite atlases. The main runtime previously treated them as a 128px grid.
// Intercept only those old Flare draw calls and remap them to verified stance frames/anchors.
const proto=CanvasRenderingContext2D.prototype,nativeDraw=proto.drawImage;
const flareFrames={
 'male/default_legs.png':[147,242,69,77,21,72],
 'male/default_chest.png':[1154,218,80,106,30,115],
 'male/head_short.png':[638,458,71,108,7,133],
 'female/default_legs.png':[175,397,56,82,13,84],
 'female/default_chest.png':[1029,324,70,107,18,120],
 'female/head_long.png':[675,349,68,116,9,141]
};
if(!proto.__survivalFlarePackedFix){
 proto.__survivalFlarePackedFix=true;
 proto.drawImage=function(img,...a){
   const src=String(img&&img.src||'');
   if(src.includes('/flareteam/flare-game/')&&src.includes('/images/avatar/')&&a.length===8&&a[0]===0&&a[1]===512&&a[2]===128&&a[3]===128){
     const key=Object.keys(flareFrames).find(k=>src.includes(k));
     if(!key)return; // omit hands/feet in compact render; legs/chest/head already form a clean human silhouette
     const [sx,sy,sw,sh,ox,oy]=flareFrames[key],dx=a[4],dy=a[5],out=a[6];
     const anchorX=dx+out/2,anchorY=dy+out*.88,k=out/160;
     return nativeDraw.call(this,img,sx,sy,sw,sh,Math.round(anchorX-ox*k),Math.round(anchorY-oy*k),Math.round(sw*k),Math.round(sh*k));
   }
   return nativeDraw.call(this,img,...a);
 };
}
const BASE='https://raw.githubusercontent.com/eturner58/game-assets/main/kenney/2D%20assets/Isometric%20Tiles%20Buildings/PNG/';
const files={hut:'buildingTiles_000.png',wall:'buildingTiles_005.png',tower:'buildingTiles_009.png',signal:'buildingTiles_010.png'};
const metrics={hut:{scale:1.34,y:8},wall:{scale:.82,y:5},tower:{scale:1.18,y:10},signal:{scale:1.08,y:9}};
function image(file){const img=new Image();img.crossOrigin='anonymous';img.src=BASE+file;return img;}
const assets=Object.fromEntries(Object.entries(files).map(([kind,file])=>[kind,image(file)]));
let tries=0;
function install(){
  const runtime=window.Survival25D;
  if(!runtime?.realAssets){if(++tries<100)setTimeout(install,50);return;}
  for(const [kind,img] of Object.entries(assets))runtime.realAssets[kind]=img;
  runtime.buildingMetrics=metrics;
  runtime.cc0BuildingFiles=files;
  if(!runtime.getVisualMetric)runtime.getVisualMetric=(kind,size)=>{const m=metrics[kind];return m?{size:Math.round(size*m.scale),y:m.y}:{size,y:0};};
}
install();
})();
