// 파일명: assets/vibe-art-pipeline.js
// 역할: 자연어 요구를 게임 그래픽·애니메이션·VFX·사운드 제작 사양으로 변환
// 규칙: 게임 판정과 표현을 분리하고 기존 규칙/세이브는 보존

const QUALITY_WORDS = Object.freeze({
  art: ['그래픽', '그림', '비주얼', '캐릭터', '곤충', '배경', '에셋', '퀄리티', '고퀄'],
  animation: ['애니', '애니메이션', '모션', '움직임', '동작', '걷기', '공격모션', '피격', '사망'],
  vfx: ['이펙트', '효과', 'vfx', '파티클', '폭발', '빛', '피격효과', '스킬연출'],
  audio: ['소리', '사운드', '음악', 'bgm', '효과음', '공격음', '피격음'],
});
const ASSET_TRANSFORMS = Object.freeze(['crop','scale','rotate','recolor','contrast','lighting','material','silhouette','part-separation','part-recomposition','layering','tile-repeat','shadow','outline','animation-rig','vfx-derivative','mobile-simplification']);
const DERIVATIVE_LICENSE_HINTS = Object.freeze(['cc0','public domain','mit','apache-2.0','apache 2.0','bsd','cc-by','cc by']);

function clean(value) { return String(value ?? '').trim(); }
function has(value, words) { const text = clean(value).toLowerCase(); return words.some((word) => text.includes(String(word).toLowerCase())); }
function unique(values) { return [...new Set(values.filter(Boolean))]; }
function licenseAllowsDerivative(license = '') { const value = clean(license).toLowerCase(); return DERIVATIVE_LICENSE_HINTS.some((hint) => value.includes(hint)); }

function level(request, words) {
  if (!has(request, words)) return 0;
  if (has(request, ['최고', '최상', '시네마틱', 'AAA', '고도', '고급', '전면', '완전히', '리메이크'])) return 3;
  if (has(request, ['고퀄', '퀄리티', '디테일', '자연스럽게', '강화'])) return 2;
  return 1;
}

export function createVibeAssetReconstructionContract({ asset = {}, requestedTransforms = ASSET_TRANSFORMS, derivativePurpose = 'game-art-reconstruction' } = {}) {
  const license = clean(asset.license);
  const source = clean(asset.source);
  const explicit = asset.derivativesAllowed;
  const derivativesAllowed = explicit === true || (explicit !== false && licenseAllowsDerivative(license));
  const transforms = unique((requestedTransforms || []).filter((item) => ASSET_TRANSFORMS.includes(item)));
  const attributionRequired = /cc[- ]?by/i.test(license);
  const blockedReason = derivativesAllowed ? null : (!license ? 'license-missing' : explicit === false ? 'derivatives-explicitly-forbidden' : 'derivative-permission-unverified');
  return Object.freeze({
    version: 1,
    assetId: clean(asset.id || asset.name || asset.path),
    source,
    license,
    derivativePurpose,
    derivativesAllowed,
    attributionRequired,
    requestedTransforms: Object.freeze(transforms),
    allowedTransforms: Object.freeze(derivativesAllowed ? transforms : []),
    blockedReason,
    reconstruction: Object.freeze({ decompose: derivativesAllowed, recombine: derivativesAllowed, silhouetteRedesign: derivativesAllowed, variantGeneration: derivativesAllowed, animationPreparation: derivativesAllowed, artBibleNormalization: derivativesAllowed, mobileOptimization: derivativesAllowed }),
    policy: Object.freeze({ licenseBeforeTransform: true, preserveSourceMetadata: true, preserveAttribution: attributionRequired, noUnverifiedDerivativeUse: true, noGameplayMutation: true, noSaveMutation: true }),
    authority: 'asset-transformation-gate',
  });
}

export function createVibeArtPipeline({ request = '', target = 'auto', style = null, quality = 'auto' } = {}) {
  const prompt = clean(request);
  if (!prompt) throw new Error('art pipeline request required');
  const artLevel = quality === 'auto' ? level(prompt, QUALITY_WORDS.art) : Number(quality) || 1;
  const animationLevel = quality === 'auto' ? level(prompt, QUALITY_WORDS.animation) : Number(quality) || 1;
  const vfxLevel = quality === 'auto' ? level(prompt, QUALITY_WORDS.vfx) : Number(quality) || 1;
  const audioLevel = quality === 'auto' ? level(prompt, QUALITY_WORDS.audio) : Number(quality) || 1;
  const needsArt = artLevel > 0 || animationLevel > 0 || vfxLevel > 0;
  const states = ['idle', 'move', 'attack', 'hit', 'skill', 'death'];
  const layers = ['캐릭터 실루엣','본체/장비 파츠','그림자','방향 전환','애니메이션 상태','피격/공격 판정 연결','VFX 레이어','UI 피드백'];
  const steps = [];
  if (needsArt) steps.push('현재 에셋과 스타일을 분석하고 목표 비주얼 프로필 확정');
  if (needsArt) steps.push('원본 에셋 라이선스와 파생저작물 허용 여부를 변형 전에 검사');
  if (artLevel) steps.push(`${artLevel >= 3 ? '고품질' : artLevel === 2 ? '상세' : '기본'} 캐릭터·적·보스·배경 에셋 구성`);
  if (artLevel >= 2) steps.push('허용 에셋을 분해하고 크롭/스케일/회전/색/명암/재질/실루엣을 재가공');
  if (artLevel >= 2) steps.push('분리 파츠를 재조합하고 지역종·변이종·보스 파생 디자인을 구성');
  if (artLevel >= 2) steps.push('Art Bible 기준으로 서로 다른 원본의 색·형태·재질·조명을 통일');
  if (animationLevel) steps.push(`분리 파츠 기반 ${states.join('/')} 애니메이션 구성`);
  if (animationLevel) steps.push('공격 시작/명중/종료 타이밍을 실제 판정과 동기화');
  if (vfxLevel) steps.push(`${vfxLevel >= 3 ? '고급' : vfxLevel === 2 ? '상세' : '기본'} 히트·폭발·스킬·사망 VFX 구성`);
  if (audioLevel) steps.push('BGM과 전투/UI 효과음의 이벤트 연결');
  steps.push('모바일 해상도에서 실루엣 가독성·디테일·성능을 확인하고 필요 시 표현만 단순화');
  steps.push('에셋 라이선스·출처·귀속·경로·참조 무결성 검사');
  const godot = target === 'godot' || /godot|고도|\.gd|씬/i.test(prompt);
  const web = target === 'web' || /웹|브라우저|html|javascript/i.test(prompt);
  const implementation = godot ? ['Sprite2D/AnimatedSprite2D','SpriteFrames','GPUParticles2D/CPUParticles2D','AnimationPlayer 또는 Tween','AudioStreamPlayer'] : web ? ['Canvas/Sprite 렌더러','스프라이트 시트/프레임 애니메이션','파티클 레이어','Web Audio API','CSS/Canvas UI 연출'] : ['플랫폼별 기본 2D 렌더러','프레임 애니메이션','파티클','오디오 이벤트'];
  return Object.freeze({
    version: 2,
    target: godot ? 'godot' : web ? 'web' : target,
    quality: Object.freeze({ art: artLevel, animation: animationLevel, vfx: vfxLevel, audio: audioLevel }),
    style: style || '프로젝트 기존 스타일 분석 후 일관된 스타일로 확정',
    art: Object.freeze({ required: needsArt, layers: Object.freeze(layers), replaceableAssets: true, silhouetteRequired: true, reconstructionSupported: true, transforms: ASSET_TRANSFORMS, derivativeGateRequired: true, artBibleNormalization: true, variantGeneration: true }),
    animation: Object.freeze({ required: animationLevel > 0 || needsArt, states: Object.freeze(states), partSeparated: animationLevel >= 2, motionSyncRequired: true }),
    vfx: Object.freeze({ required: vfxLevel > 0 || animationLevel >= 2, hit: true, skill: true, death: true, screenFeedback: true }),
    audio: Object.freeze({ required: audioLevel > 0, bgm: audioLevel >= 2, sfx: true, eventDriven: true, mobileSafe: true }),
    implementation: Object.freeze(implementation),
    steps: Object.freeze(unique(steps)),
    qa: Object.freeze(['에셋 경로/라이선스/파생 허용','출처/귀속 메타데이터 보존','스타일 일관성','실루엣 식별성','파츠 분해/재조합 무결성','스프라이트/프레임 정상 로드','애니메이션 상태 전환','모션-판정 동기화','VFX 생명주기/중복 생성','오디오 이벤트 중복/누락','모바일 터치와 UI 겹침','성능/메모리']),
    policy: Object.freeze({ preserveGameplay: true, preserveSave: true, directEditPreferred: true, noPlaceholderArtForFinal: true, licenseBeforeDerivative: true, noUnverifiedDerivativeUse: true }),
  });
}

export const planVibeArtPipeline = createVibeArtPipeline;
if (typeof window !== 'undefined') Object.assign(window,{createJaewoonVibeArtPipeline:createVibeArtPipeline,createJaewoonVibeAssetReconstructionContract:createVibeAssetReconstructionContract});
