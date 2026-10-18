// Legacy filename retained for existing imports. Authoritative final gameplay is REAL 3D.
// 2.5D is permitted ONLY in presentation-only UI overlays (HUD, health, damage, inventory).
// Existing approved 2D gameplay is preserved until a working 3D replacement is verified.
export const VIBE_WEB_3D_POLICY=Object.freeze({
  version:2,
  authority:'company-learning/platform-release-roadmap.json#ownerActiveDevelopmentScope20261009',
  mandatory:true,
  minimumFinalGameplayDimension:'3D',
  gameplayWorld:'NATIVE_DEPTH_TESTED_3D',
  projection:'PERSPECTIVE_OR_NATIVE_ORTHOGRAPHIC_3D_CAMERA',
  actualTriangleMeshesRequired:true,
  nativeDepthTestRequired:true,
  real3DCameraRequired:true,
  xyzMovementAndCollisionRequired:true,
  spatialGameplayAssets3dOnly:true,
  forbiddenFinalGameplay:Object.freeze([
    'flat-2d-world',
    'projected-2.5d-world',
    'isometric-sprite-world',
    'dom-or-canvas-world-depth-simulation',
    'css-perspective-world-substitute',
    'flat-plane-only-3d-claim',
    'fake-3d-source-markers'
  ]),
  overlays:Object.freeze({
    twoPointFiveDAllowed:true,
    presentationOnly:true,
    worldOrPlayerOrEnemyReplacementForbidden:true,
    authoritativeGameplayMutationForbidden:true,
    surfaces:Object.freeze(['HUD','HEALTH_BAR','DAMAGE_NUMBER','INVENTORY',
      'TOOLTIP','QUEST','MAP','MINIMAP','NOTIFICATION','DIALOGUE','SHOP',
      'EQUIPMENT','CRAFT','PARTY','SETTINGS','STATUS_EFFECT'])
  }),
  runtimeEvidenceRequired:true,
  releaseGate:'assertVibeWebRelease',
  preserveLegacyUntilActual3dPass:true
});
// Backwards compatibility is intentionally an alias to 3D requirements,
// NEVER an authorization to ship a projected 2.5D gameplay world.
export const VIBE_WEB_25D_POLICY=VIBE_WEB_3D_POLICY;
export function requireVibeWeb3D(target='web'){
  return String(target).toLowerCase()==='web'?VIBE_WEB_3D_POLICY:null;
}
export const requireVibeWeb25D=requireVibeWeb3D;
if(typeof window!=='undefined'){
  window.VIBE_WEB_3D_POLICY=VIBE_WEB_3D_POLICY;
  window.VIBE_WEB_25D_POLICY=VIBE_WEB_3D_POLICY;
}
