// Vibe2 Web 2.5D mandatory implementation policy
// Every Web game must ship as a projected 2.5D world, not a flat top-down scene.
export const VIBE_WEB_25D_POLICY=Object.freeze({
  version:1,
  mandatory:true,
  projection:'dimetric/isometric',
  worldCoordinates:'x,y,z',
  required:Object.freeze([
    'world-to-screen projection',
    'screen-to-world inverse mapping for pointer/touch when needed',
    'depth sort by projected foot position / x+y',
    'elevation or z offset',
    'ground/contact shadows for actors and tall props',
    'bottom-center sprite anchoring',
    'camera follow in projected space',
    'viewport culling',
    'mobile touch controls',
    'real coherent image assets'
  ]),
  forbidden:Object.freeze([
    'flat top-down release rendering',
    'DOM z-index used as world-depth substitute',
    'geometric placeholder characters/enemies/props',
    'emoji used as gameplay art'
  ]),
  referenceMath:Object.freeze({
    screenX:'(worldX-worldY)*tileWidth/2',
    screenY:'(worldX+worldY)*tileHeight/2-worldZ*heightScale',
    depth:'worldX+worldY'
  }),
  releaseGate:'assertVibeWebRelease'
});
export function requireVibeWeb25D(target='web'){
  if(String(target).toLowerCase()==='web') return VIBE_WEB_25D_POLICY;
  return null;
}
if(typeof window!=='undefined')window.VIBE_WEB_25D_POLICY=VIBE_WEB_25D_POLICY;
