// Existing Vibe2 web spatial policy module; compatibility exports retain callers.
// The central roadmap already requires a real 3D gameplay world. Projection tricks
// and UI art are never accepted as 3D game-world or runtime evidence.
export const VIBE_WEB_3D_POLICY=Object.freeze({
  version:2,
  authority:'company-learning/platform-release-roadmap.json#webRuntimeStartabilityContract',
  minimumFinalGameplayDimension:'3D',
  appliesTo:Object.freeze(['WEB','ROBLOX_GAMEPLAY','UNITY_GAMEPLAY_WHEN_OWNER_HOLD_RELEASED']),
  mandatory:true,
  webEnginePreference:'PLAYCANVAS_WEBGL2',
  acceptedEngines:Object.freeze(['PLAYCANVAS','BABYLON','EXISTING_THREE','EXISTING_NATIVE_WEBGL']),
  required:Object.freeze([
    'real triangle mesh and native 3D material/texture bindings',
    'actual WebGL depth-tested triangle draw calls',
    'active 3D camera with observed world-space camera movement',
    'real XYZ gameplay entity state and world interactions',
    'engine-native 3D collision or verified spatial interaction',
    'real 3D actor and environment models with verified licensing',
    'mobile touch and input supported by existing game client',
    'exact-revision runtime and independent regression evidence'
  ]),
  forbidden:Object.freeze([
    '2D gameplay and final 2.5D pseudo-depth',
    'flat canvas or DOM cards standing in for gameplay world',
    'CSS transforms, parallax or isometric projection as 3D proof',
    'sprite or emoji player/enemy standing in for 3D actors',
    'data-spatial-dimension tag as evidence',
    '2D asset libraries passed off as 3D world models'
  ]),
  uiOverlayMayRemain2D:true,
  uiTexturesIconsAndFontsArePresentationOnly:true,
  gameplayMustBeNative3d:true,
  native3dRuntimeProofRequired:true,
  existing2dGameplayAction:'IN_PLACE_3D_REDEVELOPMENT_PRESERVE_GAMEPLAY_AND_SAVE',
  oldPlayableVersionPreservedUntilVerified3dReplacement:true,
  ownerHeldPlatformsRemainHeld:true,
  releaseGate:'existing canonical F0-F9 and runtime spatial QA'
});
// Existing export names survive; their *minimum* is now real 3D, never 2.5D.
export const VIBE_WEB_25D_POLICY=VIBE_WEB_3D_POLICY;
export function requireVibeWeb25D(target='web'){
  if(String(target).toLowerCase()==='web')return VIBE_WEB_3D_POLICY;
  return null;
}
export const requireVibeWeb3D=requireVibeWeb25D;
if(typeof window!=='undefined')window.VIBE_WEB_25D_POLICY=VIBE_WEB_3D_POLICY;
