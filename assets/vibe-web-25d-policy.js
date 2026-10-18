// Canonical policy mirror: all final gameplay worlds are actual native 3D.
// Historical filename is retained solely to avoid breaking existing imports.
// Authority: company-learning/platform-release-roadmap.json#livingMotionVisualQualityContract.minimumSpatialPresentation
export const VIBE_WEB_3D_POLICY=Object.freeze({
  version:2,mandatory:true,minimumFinalGameplayDimension:'3D',
  worldGeometry:'NATIVE_TRIANGLE_MESH_WITH_VOLUME',
  camera:'PERSPECTIVE_OR_ORTHOGRAPHIC_CAMERA_WITH_REAL_WORLD_DEPTH',
  renderer:'REAL_WEBGL_OR_EQUIVALENT_DEPTH_TESTED_3D',
  gameplay:'SPATIAL_3D_COLLISION_MOVEMENT_AND_INTERACTION',
  assets:'VERIFIED_LICENSED_3D_MODELS_AND_NATIVE_SPATIAL_OBJECTS',
  allowedSupporting2D:Object.freeze(['HUD','MENUS','TOOLTIPS','ICONS','TEXT','TEXTURES','MAP_OVERLAYS','AUDIO_UI']),
  forbiddenFinalWorld:Object.freeze([
    '2D_GAMEPLAY_ONLY','2_5D_PROJECTED_SPRITE_WORLD','ISOMETRIC_CARDS_WITHOUT_NATIVE_MESH',
    'DOM_CSS_FAKE_PERSPECTIVE','PARALLAX_ONLY','FLAT_CANVAS_WORLD',
    'SPRITE_ONLY_CHARACTERS_OR_TERRAIN','FAKE_3D_DATA_ATTRIBUTES_OR_TEXT_MARKERS'
  ]),
  existing2DConversion:'PRESERVE_WORKING_GAMEPLAY_SAVE_AND_SOURCE_UNTIL_REAL_3D_RUNTIME_REPLACEMENT_VERIFIED',
  runtimeProof:Object.freeze([
    'EXACT_SOURCE_REVISION','REAL_RENDERED_TRIANGLE_MESH','DEPTH_BUFFER_AND_TEST',
    'ACTUAL_3D_CAMERA','WORLD_SPACE_INTERACTION','MOBILE_INPUT_AND_FRAME',
    'INDEPENDENT_CAPTURE_AND_REGRESSION'
  ]),
  unityAndOtherHeldPlatformsRemainHeld:true,
  noParallelPipeline:true,
  releaseGate:'assertVibeWebRelease'
});
export function requireVibeWeb3D(target='web'){
  return ['web','roblox','unity','unity-web','unity-native'].includes(String(target).toLowerCase())
    ?VIBE_WEB_3D_POLICY:null;
}
// Backwards-compatible identifier: returns the current 3D policy, never 2.5D authorization.
export const VIBE_WEB_25D_POLICY=VIBE_WEB_3D_POLICY;
export const requireVibeWeb25D=requireVibeWeb3D;
if(typeof window!=='undefined')window.VIBE_WEB_3D_POLICY=VIBE_WEB_3D_POLICY;
