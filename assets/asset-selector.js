// 파일명: assets/asset-selector.js
// 역할: 자연어 요구에서 필요한 에셋 종류를 판별하고 실제 게임 객체에 적용할 매핑 계획을 생성
// 규칙: 기존 저장소 우선, 라이선스 불명/NC 차단, 캐릭터/적/보스는 검증된 실제 애니메이션 에셋 필수

const TYPES = Object.freeze({
  character: ['주인공', '캐릭터', '영웅', '플레이어', '기사', '궁수', '사마귀'],
  enemy: ['적', '몬스터', '고블린', '오크', '좀비', '거미', '전갈', '벌'],
  boss: ['보스', '중간보스', '대형'],
  background: ['배경', '숲', '사막', '황무지', '동굴', '광산', '성', '마을', '기지'],
  item: ['아이템', '검', '칼', '활', '방패', '갑옷', '물약', '장비', '도구'],
  prop: ['사물', '나무', '바위', '풀', '버섯', '상자', '건물', '집', '벽', '문', '자원'],
  effect: ['이펙트', '폭발', '불꽃', '마법', '피격', '스킬 효과', '파티클'],
  ui: ['UI', '버튼', '체력바', '조이스틱', '인벤토리', '상점'],
  audio: ['소리', '사운드', '효과음', 'BGM', '음악'],
  animation: ['애니', '애니메이션', '움직임', '걷기', '달리기', '공격 모션', '피격 모션', '사망 모션'],
});

const REQUIRED_VISUAL_TYPES = Object.freeze(['character', 'enemy', 'boss', 'background', 'item', 'prop', 'effect', 'ui', 'animation']);
const ACTOR_TYPES = Object.freeze(['character', 'enemy', 'boss']);
const DEFAULT_MOTION_STATES = Object.freeze(['idle', 'move', 'attack', 'hit', 'skill', 'death']);
const LOCOMOTION_STATES = Object.freeze(['move', 'walk', 'run', 'jump', 'fly', 'swim', 'crawl']);
const BLOCKED_LICENSE_WORDS = Object.freeze(['NC', 'unknown', '출처 불명', '재배포 제한']);
const BLOCKED_ACTOR_VISUAL_WORDS = Object.freeze(['circle', 'sphere', 'orb', 'ball', '원형', '구체', 'placeholder', 'dummy', 'primitive']);

function text(value) { return String(value ?? '').trim(); }
function unique(values) { return [...new Set(values.filter(Boolean))]; }
function hasAny(source, words) { const value = text(source).toLowerCase(); return words.some((word) => value.includes(String(word).toLowerCase())); }
function declaredTypes(asset) { return Array.isArray(asset?.types) ? asset.types.map((value) => text(value).toLowerCase()) : []; }

function actorHasAnimation(asset) {
  const animations = Array.isArray(asset?.animations) ? asset.animations.map((value) => text(value).toLowerCase()) : [];
  const states = Array.isArray(asset?.states) ? asset.states.map((value) => text(value).toLowerCase()) : [];
  const evidence = Array.isArray(asset?.animationEvidence) ? asset.animationEvidence.filter(Boolean) : [];
  const motion = unique([...animations, ...states]);
  const verified = asset?.verifiedAnimation === true;
  const hasAnimationResource = motion.length > 0 || evidence.length > 0;
  const hasLocomotion = LOCOMOTION_STATES.some((state) => motion.includes(state));
  return verified && hasAnimationResource && hasLocomotion;
}

function findCandidates(type, candidates) {
  return candidates.filter((asset) => {
    const tags = Array.isArray(asset?.tags) ? asset.tags.join(' ') : text(asset?.tags);
    const descriptor = `${asset?.id || ''} ${asset?.name || ''} ${tags}`;
    const declared = declaredTypes(asset);
    if (!declared.includes(type) && !hasAny(descriptor, TYPES[type])) return false;

    if (ACTOR_TYPES.includes(type)) {
      if (asset?.blockedForActorUse === true) return false;
      if (hasAny(descriptor, BLOCKED_ACTOR_VISUAL_WORDS)) return false;
      if (!actorHasAnimation(asset)) return false;
    }

    return true;
  }).map((asset) => ({
    type,
    id:text(asset.id),
    path:text(asset.path),
    license:text(asset.license),
    source:text(asset.source),
    downloaded:asset?.downloaded !== false,
    animated:ACTOR_TYPES.includes(type) ? true : Boolean(asset?.verifiedAnimation),
  }));
}

function choosePrototypePreset(request, presetCatalog) {
  const presets = Array.isArray(presetCatalog?.presets) ? presetCatalog.presets : [];
  if (!presets.length) return null;
  const source = text(request).toLowerCase();
  let best = null;
  let bestScore = -1;
  for (const preset of presets) {
    const keywords = Array.isArray(preset?.keywords) ? preset.keywords : [];
    const score = keywords.reduce((sum, keyword) => sum + (source.includes(text(keyword).toLowerCase()) ? 1 : 0), 0);
    const adjusted = score + (preset?.default === true ? 0.01 : 0);
    if (adjusted > bestScore) {
      best = preset;
      bestScore = adjusted;
    }
  }
  return best ? Object.freeze({
    id:text(best.id),
    name:text(best.name),
    actorAssets:Object.freeze([...(best.actorAssets || [])]),
    effectAssets:Object.freeze([...(best.effectAssets || [])]),
    supportingSourcePriority:Object.freeze([...(best.supportingSourcePriority || [])]),
  }) : null;
}

function presetPreferredIds(preset) {
  if (!preset) return new Set();
  return new Set([...(preset.actorAssets || []), ...(preset.effectAssets || [])].map(text));
}

export function planAssetApplication({ prompt = '', manifest = null, presetCatalog = null, rebuild = false } = {}) {
  const request = text(prompt);
  if (!request) throw new Error('asset request required');
  const requestedTypes = Object.entries(TYPES).filter(([, words]) => hasAny(request, words)).map(([type]) => type);
  // 바이브2 기본값: 새 게임/수정 모두 전체 시각 에셋을 요구한다.
  const types = unique([...REQUIRED_VISUAL_TYPES, ...requestedTypes]);
  const assets = Array.isArray(manifest?.assets) ? manifest.assets : [];
  const candidates = assets.filter((asset) => {
    const license = text(asset?.license || asset?.policy || '');
    return !BLOCKED_LICENSE_WORDS.some((blocked) => license.toLowerCase().includes(blocked.toLowerCase()));
  });
  const prototypePreset = choosePrototypePreset(request, presetCatalog);
  const preferredIds = presetPreferredIds(prototypePreset);
  const matched = types.flatMap((type) => findCandidates(type, candidates))
    .sort((a, b) => Number(preferredIds.has(b.id)) - Number(preferredIds.has(a.id)));
  const missingTypes = types.filter((type) => !matched.some((item) => item.type === type));
  const binding = types.map((type) => Object.freeze({
    type,
    required:true,
    targetStates:ACTOR_TYPES.includes(type) || type === 'animation' ? [...DEFAULT_MOTION_STATES] : [],
    matchedAssetIds:matched.filter((item) => item.type === type).map((item) => item.id),
    fallback:'none',
    replaceable:true,
  }));
  return Object.freeze({
    version:6,
    request,
    rebuild:Boolean(rebuild),
    prototypePreset,
    requestedTypes:Object.freeze(types),
    matched:Object.freeze(matched),
    missingTypes:Object.freeze(missingTypes),
    binding:Object.freeze(binding),
    ready:missingTypes.length===0,
    animation:Object.freeze({
      required:true,
      actorAnimationRequired:true,
      locomotionStates:[...LOCOMOTION_STATES],
      states:[...DEFAULT_MOTION_STATES],
      stateDriven:true,
      staticActorAllowed:false,
      replaceableWithoutGameplayRewrite:true,
    }),
    policy:Object.freeze({
      existingAssetsFirst:true,
      prototypePresetFirst:true,
      blockedLicenses:[...BLOCKED_LICENSE_WORDS],
      blockedActorVisualWords:[...BLOCKED_ACTOR_VISUAL_WORDS],
      requireLicenseRecord:true,
      requireRealAssets:true,
      requireVerifiedAnimation:true,
      requireAnimatedCharacter:true,
      requireAnimatedEnemy:true,
      requireAnimatedBoss:true,
      allowStaticActor:false,
      allowProceduralPlaceholder:false,
      allowEmojiPlaceholder:false,
      allowGeometricPlaceholder:false,
      styleConsistencyRequired:true,
      downloadOnDemand:true,
      cacheAfterFirstUse:true,
    }),
    steps:Object.freeze([
      '초안 장르에 맞는 prototype-asset-presets 프리셋 자동 선택',
      '기존 저장소 에셋 확인',
      '캐릭터/적/보스는 실제 애니메이션 프레임 또는 스프라이트시트와 이동 모션 보유 여부 확인',
      '정지 캐릭터/정지 몬스터/원형·구체·도형 대체 모델 후보 제거',
      '프리셋의 검증 배우 에셋을 우선 적용하고 미다운로드 에셋은 최초 사용 시 확보·캐시',
      '캐릭터/적/NPC/배경/지형/사물/자원/건물/UI/VFX 목록 작성',
      '누락 에셋은 승인 소스에서 라이선스 확인 후 확보',
      'LICENSES.md 기록',
      '모든 월드 객체를 실제 이미지/스프라이트/타일 에셋에 연결',
      '캐릭터/적/보스 애니메이션 상태를 실제 모션 리소스에 연결',
      '도형/이모지/단색 임시 그래픽 잔존 여부 검사',
      '에셋과 게임 로직 분리 확인',
      '모바일 화면/성능 확인',
    ]),
  });
}

if (typeof window !== 'undefined') window.planJaewoonAssetApplication = planAssetApplication;
