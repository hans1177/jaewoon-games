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
export const GOLDEN_SCENE_ROLES=Object.freeze([
  'PLAYER_OR_PRIMARY_CHARACTER_CLOSEUP',
  'PRIMARY_ENEMY_OR_CREATURE_CLOSEUP',
  'CORE_GAMEPLAY_ACTION',
  'WORLD_OR_REGION_WIDE',
  'MOBILE_GAMEPLAY_HUD',
]);
const RUNTIME_CAPTURE_SOURCES=new Set(['runtime-capture','roblox-runtime-capture','internal-playtest-capture','golden-scene-capture']);
const PRIMITIVE_PRESENTATIONS=new Set(['primitive','primitive-placeholder','part-placeholder','block-placeholder','ball-placeholder','cylinder-placeholder']);

export function auditVibeGoldenSceneEvidence(evidence={}){
  const captures=Array.isArray(evidence.captures)?evidence.captures:[];
  const candidateRevision=String(evidence.candidateRevision||'').trim();
  const byRole=new Map(captures.map(c=>[String(c?.role||'').trim().toUpperCase(),c]));
  const missing=[],invalid=[];
  for(const role of GOLDEN_SCENE_ROLES){
    const capture=byRole.get(role);
    if(!capture){missing.push(role);continue;}
    const source=String(capture.source||'').trim().toLowerCase();
    const artifact=String(capture.artifactId||capture.captureId||capture.path||'').trim();
    const revision=String(capture.candidateRevision||candidateRevision||'').trim();
    const observed=capture.observed===true;
    const reviewed=capture.reviewed===true;
    const comparisonPass=capture.comparison?.pass===true;
    if(!RUNTIME_CAPTURE_SOURCES.has(source)||!artifact||!revision||!observed||!reviewed||!comparisonPass)invalid.push(role);
  }
  const markerOnly=captures.some(c=>c?.markerOnly===true||String(c?.source||'').toLowerCase()==='source-marker');
  return Object.freeze({
    version:1,
    pass:missing.length===0&&invalid.length===0&&!markerOnly,
    requiredRoles:GOLDEN_SCENE_ROLES,
    captureCount:captures.length,
    missing:Object.freeze(missing),
    invalid:Object.freeze(invalid),
    markerOnly,
    candidateRevision:candidateRevision||null,
    authority:'runtime-visual-evidence-audit'
  });
}

export function auditVibeRuntimeVisualEvidence(evidence={}){
  const stage=String(evidence.stage||'INTERNAL_PLAYTEST').trim().toUpperCase();
  const golden=auditVibeGoldenSceneEvidence(evidence);
  const primaryActors=Array.isArray(evidence.primaryActors)?evidence.primaryActors:[];
  const visualDebt=Array.isArray(evidence.visualDebt)?evidence.visualDebt:[];
  const strictStage=stage==='INTERNAL_PLAYTEST'||stage==='FINAL'||stage==='PUBLIC_RELEASE';
  const finalStage=stage==='FINAL'||stage==='PUBLIC_RELEASE';
  const primitiveViolations=primaryActors.filter(actor=>{
    const presentation=String(actor?.presentation||actor?.assetClass||'').trim().toLowerCase();
    const primitive=PRIMITIVE_PRESENTATIONS.has(presentation)||actor?.placeholder===true;
    return strictStage&&primitive&&actor?.explicitStylizedApproval!==true;
  }).map(actor=>String(actor?.id||actor?.role||'UNKNOWN_PRIMARY_ACTOR'));
  const openCriticalDebt=visualDebt.filter(debt=>String(debt?.status||'OPEN').toUpperCase()!=='RESOLVED'&&['critical','high'].includes(String(debt?.severity||'high').toLowerCase()));
  const reasons=[];
  if(!golden.pass)reasons.push('golden-scene-runtime-evidence-incomplete');
  if(primitiveViolations.length)reasons.push('primary-actor-primitive-placeholder');
  if(finalStage&&openCriticalDebt.length)reasons.push('unresolved-critical-visual-debt');
  if(evidence.markerOnlyPass===true)reasons.push('marker-only-presentation-pass-forbidden');
  return Object.freeze({
    version:1,
    pass:reasons.length===0,
    stage,
    golden,
    primaryActorCount:primaryActors.length,
    primitiveViolations:Object.freeze(primitiveViolations),
    openCriticalVisualDebt:Object.freeze(openCriticalDebt.map(row=>String(row?.id||row?.role||'visual-debt'))),
    reasons:Object.freeze(reasons),
    authority:'runtime-visual-quality-gate'
  });
}

export function assertVibeRuntimeVisualQuality(evidence={}){
  const audit=auditVibeRuntimeVisualEvidence(evidence);
  if(!audit.pass)throw new Error(`Vibe2 런타임 그래픽 품질 게이트 차단 · ${audit.reasons.join(' · ')}`);
  return audit;
}

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
