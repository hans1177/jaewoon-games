// Vibe2 mandatory visual quality gate
// Final games must use real, coherent assets for visible gameplay objects.
const IMAGE_EXT=/\.(png|webp|jpg|jpeg|gif|svg)$/i;
const VISUAL_HINT=/(player|character|hero|companion|npc|enemy|boss|monster|background|terrain|tile|tree|rock|plant|resource|building|house|door|chest|weapon|armor|item|projectile|effect|vfx|icon|ui)/i;
const PLACEHOLDER_CODE=/(ctx\.(?:arc|fillRect|strokeRect|ellipse|lineTo|moveTo)\s*\(|fillStyle\s*=\s*['\"]#[0-9a-f]{3,8}|[😀-🙏🌀-🫿])/u;
const REAL_RENDER=/(drawImage\s*\(|<img\b|background(?:-image)?\s*:\s*url\(|Sprite2D|AnimatedSprite2D|TextureRect|TextureButton|texture\s*=)/i;
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
  return {pass,assets:assets.length,namedAssets:namedAssets.length,usesRealAssets,coherentAssetSet,missing,placeholderHits,reasons:[
    ...(assets.length?[]:['실제 이미지/스프라이트 에셋 없음']),
    ...(usesRealAssets?[]:['실제 에셋 렌더링 연결 없음']),
    ...(missing.length?[`필수 에셋 분류 누락: ${missing.join(', ')}`]:[]),
    ...(placeholderHits.length?[`도형/이모지 placeholder 잔존: ${placeholderHits.join(', ')}`]:[]),
    ...(coherentAssetSet?[]:['통일된 실제 에셋 세트가 부족함'])
  ]};
}
export function assertVibeVisualQuality(summary={}){
  const audit=auditVibeVisualAssets(summary);
  if(!audit.pass) throw new Error(`Vibe2 그래픽 품질 게이트 차단 · ${audit.reasons.join(' · ')}`);
  return audit;
}
