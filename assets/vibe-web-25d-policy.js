// 파일명: assets/vibe-web-25d-policy.js
// 역할: 기존 호출·내보내기 이름은 유지하고 최종 웹 게임은 실제 3D 제작만 허용한다.
export const VIBE_WEB_25D_POLICY=Object.freeze({
  version:2,
  mandatory:true,
  minimumFinalGameplayDimension:'3D',
  worldCoordinates:'x,y,z',
  required:Object.freeze([
    'real WebGL 3D renderer and scene',
    'native world geometry and mesh binding',
    'native 3D perspective or orthographic camera',
    'world-space depth lighting and occlusion',
    'character and creature 3D rigged source when applicable',
    'mobile touch input and measured frame stability',
    'actual native runtime 3D mesh evidence'
  ]),
  forbidden:Object.freeze([
    '2D sprite-only gameplay world',
    '2.5D isometric or parallax-only final gameplay',
    'CSS perspective or DOM depth as 3D substitute',
    'dimension data attribute or text marker as runtime evidence',
    'color-only duplicate character and monster',
    'emoji or geometric placeholder primary actors as final assets'
  ]),
  gameSpecificCrossGenreActorVariantsRequired:true,
  uiTexturesAndAudioCanRemain2D:true,
  legacy2DAnd2_5DGameRebuildTo3DRequired:true,
  preserveGameplaySaveProgressionBalanceAndNetwork:true,
  releaseGate:'assertVibeWebRelease'
});
export function requireVibeWeb25D(target='web'){
  if(String(target).toLowerCase()==='web')return VIBE_WEB_25D_POLICY;
  return null;
}
if(typeof window!=='undefined')window.VIBE_WEB_25D_POLICY=VIBE_WEB_25D_POLICY;
