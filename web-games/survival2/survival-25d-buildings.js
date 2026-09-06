// Survival2 CC0 2.5D building asset layer.
// Source: Kenney Isometric Tiles Buildings (CC0).
(function(){
'use strict';
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
  // Renderer hook: preserve world-space collision while tuning only visual footprint/ground contact.
  if(!runtime.getVisualMetric)runtime.getVisualMetric=(kind,size)=>{const m=metrics[kind];return m?{size:Math.round(size*m.scale),y:m.y}:{size,y:0};};
  // Campfire remains local until a matching verified 2D/isometric CC0 sprite is selected.
}
install();
})();
