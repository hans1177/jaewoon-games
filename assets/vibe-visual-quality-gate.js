// Vibe2 mandatory visual quality + Web 2.5D gate
// Web games are 2.5D by default: projected world coordinates, depth sorting, elevation/shadows and real coherent assets.
const IMAGE_EXT=/\.(png|webp|jpg|jpeg|gif|svg)$/i;
const VISUAL_HINT=/(player|character|hero|companion|npc|enemy|boss|monster|background|terrain|tile|tree|rock|plant|resource|building|house|door|chest|weapon|armor|item|projectile|effect|vfx|icon|ui)/i;
const PLACEHOLDER_CODE=/(ctx\.(?:arc|fillRect|strokeRect|ellipse)\s*\(|[😀-🙏🌀-🫿])/u;
const REAL_RENDER=/(drawImage\s*\(|<img\b|background(?:-image)?\s*:\s*url\(|Sprite2D|AnimatedSprite2D|TextureRect|TextureButton|texture\s*=)/i;
const WEB_25D_PROJECTION=/(iso(?:metric)?|dimetric|project(?:World|Iso|25D|3D)|worldToScreen|tileToScreen|screenToWorld|perspective\s*\(|rotateX\s*\(|matrix3d\s*\()/i;
const WEB_25D_DEPTH=/(depthSort|depth\s*[=:]|sort\s*\(\s*\([^)]*\)\s*=>[^\n]*(?:x\s*\+\s*y|screenY|depth|zIndex)|z-index|zIndex)/i;
const WEB_25D_HEIGHT=/(elevation|heightScale|worldZ|\bz\s*[=:]|shadow(?:Offset|Scale)?|groundShadow|castShadow)/i;
export const REQUIRED_VISUAL_TYPES=['character','enemy','boss','background','item','prop','effect','ui','animation'];
export function auditVibeVisualAssets(summary={}){
  const files=Array.isArray(summary.files)?summary.files:[];
  const assets=files.filter(f=>IMAGE_EXT.test(f.path||''));
  const gameplay=files.filter(f=>/\.(?:js|mjs|html|css|gd|tscn)$/i.test(f.path||'')&&typeof f.text==='string');
  const joined=gameplay.map(f=>f.text).join('\n');
  const namedAssets=assets.filter(f=>VISUAL_HINT.test(f.path||''));
  const usesRealAssets=REAL_RENDER.test(joined);
  const placeholderHits=gameplay.filter(f=>PLACEHOLDER_CODE.test(f.text||'')).map(f=>f.path);
  const categories={};
  for(const type of REQUIRED_VISUAL_TYPES) categories[type]=assets.some(f=>new RegExp(type==='prop'?'prop|tree|rock|plant|resource|building|house':type,'i').test(f.path||''));
  const missing=Object.entries(categories).filter(([,ok])=>!ok).map(([k])=>k);
  const coherentAssetSet=namedAssets.length>=6;
  const pass=assets.length>0&&usesRealAssets&&missing.length===0&&placeholderHits.length===0&&coherentAssetSet;
  return {pass,assets:assets.length,namedAssets:namedAssets.length,usesRealAssets,coherentAssetSet,missing,placeholderHits,reasons:[...(assets.length?[]:['실제 이미지/스프라이트 에셋 없음']),...(usesRealAssets?[]:['실제 에셋 렌더링 연결 없음']),...(missing.length?[`필수 에셋 분류 누락: ${missing.join(', ')}`]:[]),...(placeholderHits.length?[`도형/이모지 placeholder 잔존: ${placeholderHits.join(', ')}`]:[]),...(coherentAssetSet?[]:['통일된 실제 에셋 세트가 부족함'])]};
}
export function auditVibeWeb25D(summary={}){
  const files=Array.isArray(summary.files)?summary.files:[];
  const web=files.filter(f=>/\.(?:js|mjs|html|css)$/i.test(f.path||'')&&typeof f.text==='string');
  const joined=web.map(f=>f.text).join('\n');
  const projection=WEB_25D_PROJECTION.test(joined),depthSorting=WEB_25D_DEPTH.test(joined),heightOrShadow=WEB_25D_HEIGHT.test(joined);
  const pass=projection&&depthSorting&&heightOrShadow;
  return {pass,projection,depthSorting,heightOrShadow,reasons:[...(projection?[]:['2.5D 투영/카메라 변환 없음']),...(depthSorting?[]:['2.5D 깊이 정렬 없음']),...(heightOrShadow?[]:['높이/그림자 표현 없음'])]};
}
export function assertVibeVisualQuality(summary={}){const audit=auditVibeVisualAssets(summary);if(!audit.pass)throw new Error(`Vibe2 그래픽 품질 게이트 차단 · ${audit.reasons.join(' · ')}`);return audit;}
export function assertVibeWeb25D(summary={}){const audit=auditVibeWeb25D(summary);if(!audit.pass)throw new Error(`Vibe2 Web 2.5D 게이트 차단 · ${audit.reasons.join(' · ')}`);return audit;}
export function assertVibeWebRelease(summary={}){return {visual:assertVibeVisualQuality(summary),web25d:assertVibeWeb25D(summary)};}
