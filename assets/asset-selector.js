// 파일명: assets/asset-selector.js
// 역할: 자연어 요구에서 필요한 에셋 종류를 판별하고 실제 게임 객체에 적용할 매핑 계획을 생성
// 규칙: 기존 저장소 에셋 우선, 라이선스 불명/NC 차단, 그래픽·애니메이션 기본 적용

const TYPES = Object.freeze({
  character: ['주인공', '캐릭터', '영웅', '플레이어', '기사', '궁수', '사마귀'],
  enemy: ['적', '몬스터', '고블린', '오크', '좀비', '거미', '전갈', '벌'],
  boss: ['보스', '중간보스', '대형'],
  background: ['배경', '숲', '사막', '황무지', '동굴', '광산', '성', '마을', '기지'],
  item: ['아이템', '검', '칼', '활', '방패', '갑옷', '물약', '장비', '도구'],
  effect: ['이펙트', '폭발', '불꽃', '마법', '피격', '스킬 효과', '파티클'],
  ui: ['UI', '버튼', '체력바', '조이스틱', '인벤토리', '상점'],
  audio: ['소리', '사운드', '효과음', 'BGM', '음악'],
  animation: ['애니', '애니메이션', '움직임', '걷기', '달리기', '공격 모션', '피격 모션', '사망 모션'],
});

const DEFAULT_VISUAL_TYPES = Object.freeze(['character', 'enemy', 'boss', 'background', 'item', 'effect', 'ui', 'animation']);
const DEFAULT_MOTION_STATES = Object.freeze(['idle', 'move', 'attack', 'hit', 'skill', 'death']);
const BLOCKED_LICENSE_WORDS = Object.freeze(['NC', 'unknown', '출처 불명', '재배포 제한']);

function text(value) { return String(value ?? '').trim(); }
function unique(values) { return [...new Set(values.filter(Boolean))]; }
function hasAny(source, words) { const value = text(source).toLowerCase(); return words.some((word) => value.includes(String(word).toLowerCase())); }

function findCandidates(type, candidates) {
  return candidates
    .filter((asset) => {
      const tags = Array.isArray(asset?.tags) ? asset.tags.join(' ') : text(asset?.tags);
      return hasAny(`${asset?.id || ''} ${asset?.name || ''} ${tags}`, TYPES[type]);
    })
    .map((asset) => ({
      type,
      id: text(asset.id),
      path: text(asset.path),
      license: text(asset.license),
      source: text(asset.source),
    }));
}

export function planAssetApplication({ prompt = '', manifest = null, rebuild = false } = {}) {
  const request = text(prompt);
  if (!request) throw new Error('asset request required');

  const requestedTypes = Object.entries(TYPES)
    .filter(([, words]) => hasAny(request, words))
    .map(([type]) => type);

  const types = unique([
    ...requestedTypes,
    ...(rebuild ? DEFAULT_VISUAL_TYPES : []),
  ]);

  const assets = Array.isArray(manifest?.assets) ? manifest.assets : [];
  const candidates = assets.filter((asset) => {
    const license = text(asset?.license || asset?.policy || '');
    return !BLOCKED_LICENSE_WORDS.some((blocked) => license.toLowerCase().includes(blocked.toLowerCase()));
  });

  const matched = types.flatMap((type) => findCandidates(type, candidates));
  const missingTypes = types.filter((type) => !matched.some((item) => item.type === type));

  const binding = types.map((type) => Object.freeze({
    type,
    required: DEFAULT_VISUAL_TYPES.includes(type) || requestedTypes.includes(type),
    targetStates: type === 'animation' ? [...DEFAULT_MOTION_STATES] : [],
    matchedAssetIds: matched.filter((item) => item.type === type).map((item) => item.id),
    fallback: 'procedural-or-safe-placeholder',
    replaceable: true,
  }));

  return Object.freeze({
    version: 2,
    request,
    requestedTypes: Object.freeze(types),
    matched: Object.freeze(matched),
    missingTypes: Object.freeze(missingTypes),
    binding: Object.freeze(binding),
    animation: Object.freeze({
      required: rebuild || requestedTypes.includes('animation'),
      states: [...DEFAULT_MOTION_STATES],
      stateDriven: true,
      replaceableWithoutGameplayRewrite: true,
    }),
    policy: Object.freeze({ existingAssetsFirst: true, blockedLicenses: [...BLOCKED_LICENSE_WORDS], requireLicenseRecord: true, fallbackWhenMissing: true, styleConsistencyRequired: Boolean(rebuild) }),
    steps: Object.freeze(unique([
      '기존 저장소 에셋 확인',
      '현재 게임 스타일과 목표 스타일 확인',
      '라이선스 확인',
      matched.length ? '일치 에셋 우선 적용' : '일치 에셋 없음: 허용 라이선스만 추가 검토',
      '캐릭터/적/보스/배경/UI/아이템/VFX 연결',
      '애니메이션 상태와 실제 모션 리소스 연결',
      '에셋과 게임 로직 분리 확인',
      '모바일 화면/성능 확인',
    ])),
  });
}

if (typeof window !== 'undefined') window.planJaewoonAssetApplication = planAssetApplication;
