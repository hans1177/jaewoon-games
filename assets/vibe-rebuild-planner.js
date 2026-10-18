// 파일명: assets/vibe-rebuild-planner.js
// 역할: 기존 웹/Godot 게임을 출시 수준으로 리빌드하기 위한 상세 진단·개선 계획
// 규칙: 기존 규칙/세이브 보존, 그래픽·애니메이션·모션 우선, 원본 책임 구조 직접 개선

const DIMENSIONS = Object.freeze([
  'gameplay',
  'visual-style',
  'animation-motion',
  'assets',
  'combat-feedback',
  'ui-ux',
  'audio-vfx',
  'mobile',
  'performance',
  'save-compatibility',
  'content-depth',
  'release-readiness',
]);

const MODE_WORDS = Object.freeze({
  upgrade: ['고퀄', '퀄리티', '업그레이드', '고급화', '리메이크', '개선', '제대로'],
  repair: ['오류', '버그', '고장', '멈춤', '크래시', '안 돼', '복구'],
  godot: ['godot', '고도', '고도버전', '고도엔진'],
});

const STYLE_WORDS = Object.freeze({
  pixel: ['픽셀', '도트'],
  cartoon: ['카툰', '만화', '귀여운'],
  realistic: ['현실적', '리얼', '실사풍'],
  dark: ['어두운', '다크', '암울한'],
  fantasy: ['판타지', '마법', '중세'],
  scifi: ['sf', '미래', '사이버'],
  anime: ['애니풍', '애니메이션풍'],
});

function text(value) { return String(value ?? '').trim(); }
function lower(value) { return text(value).toLowerCase(); }
function hasAny(value, words) { const source = lower(value); return words.some((word) => source.includes(lower(word))); }
function unique(values) { return [...new Set(values.filter(Boolean))]; }

function inferStyle(request) {
  const styles = Object.entries(STYLE_WORDS).filter(([, words]) => hasAny(request, words)).map(([style]) => style);
  return styles.length ? styles : ['match-existing'];
}

function inferPriority(request) {
  if (hasAny(request, MODE_WORDS.repair)) return 'critical-repair-first';
  if (hasAny(request, MODE_WORDS.godot)) return 'godot-release';
  if (hasAny(request, MODE_WORDS.upgrade)) return 'quality-upgrade';
  return 'quality-upgrade';
}

function inferModes(request) {
  const modes = [];
  if (hasAny(request, MODE_WORDS.upgrade)) modes.push('upgrade');
  if (hasAny(request, MODE_WORDS.repair)) modes.push('repair');
  if (hasAny(request, MODE_WORDS.godot)) modes.push('godot-target');
  return modes.length ? modes : ['inspect'];
}

function buildVisualPlan() {
  return [
    '현재 아트 스타일 기준선 캡처',
    '캐릭터·적·보스·배경·아이템·UI 스타일 통일',
    '저해상도/임시 그래픽을 허용 라이선스 에셋 또는 기존 에셋으로 교체',
    '크기·비율·광원·색감·외곽선 규칙 통일',
    '에셋 교체 후 게임 로직과 분리됐는지 확인',
  ];
}

function buildAnimationPlan() {
  return [
    '캐릭터 상태와 실제 애니메이션 자산 연결',
    'idle → move → attack → hit → skill → death 전환 구성',
    '공격 선행동작·타격 시점·후딜과 판정 타이밍 동기화',
    '적/보스도 이동·공격·피격·사망 모션 적용',
    '스프라이트/프레임 수에 맞춰 재생 속도 자동 조정',
    '애니메이션 없는 에셋은 안전한 기본 모션으로 대체하되 나중에 교체 가능하게 유지',
  ];
}

export function createVibeRebuildPlan({ request = '', target = 'auto', gameType = 'existing', keepRules = true, preserveSave = true } = {}) {
  const prompt = text(request);
  if (!prompt) throw new Error('rebuild request required');
  const modes = inferModes(prompt);
  const style = inferStyle(prompt);
  const godotTarget = target === 'godot' || hasAny(prompt, MODE_WORDS.godot);

  const preserve = keepRules && preserveSave ? [
    '기존 플레이 규칙',
    '체력/공격력/웨이브/보상/드랍률',
    '저장 키와 세이브 데이터',
    '게임 진행도',
    '기존 콘텐츠 ID',
  ] : [];

  const phases = [
    '현재 게임 구조와 실제 플레이 흐름 조사',
    '현재 규칙·밸런스·세이브 스냅샷 생성',
    '현재 에셋과 라이선스 목록 조사',
    ...buildVisualPlan(),
    ...buildAnimationPlan(),
    '전투 피드백 강화: 타격감·피격·사망·VFX',
    'UI/UX 정리 및 모바일 터치+가상 조이스틱 적용',
    '오디오·효과음·환경 사운드 연결',
    '성능 점검 및 에셋 최적화',
    '저장/복원 회귀 검사',
    ...(godotTarget ? [
      '웹 결과를 Godot 게임 구조로 매핑',
      'Godot 씬·스크립트·리소스 연결',
      'Godot 입력/애니메이션/UI/세이브 연결',
      '출시 플랫폼별 내보내기 설정 검사',
    ] : []),
    '전용 기능 테스트',
    '최종 회귀 QA',
  ];

  return Object.freeze({
    version: 1,
    request: prompt,
    gameType: text(gameType) || 'existing',
    modes: Object.freeze(modes),
    priority: inferPriority(prompt),
    target: godotTarget ? 'godot' : (target === 'web' ? 'web' : 'web-first'),
    requestedStyles: Object.freeze(style),
    preservedTargets: Object.freeze(preserve),
    visual: Object.freeze({
      required: true,
      priority: 1,
      plan: Object.freeze(buildVisualPlan()),
      styleMustBeConsistent: true,
      replaceableWithoutGameplayRewrite: true,
    }),
    animation: Object.freeze({
      required: true,
      priority: 1,
      states: Object.freeze(['idle', 'move', 'attack', 'hit', 'skill', 'death']),
      motionSyncRequired: true,
      plan: Object.freeze(buildAnimationPlan()),
    }),
    assets: Object.freeze({
      required: true,
      existingFirst: true,
      allowedLicenses: Object.freeze(['CC0', 'commercial-no-attribution', 'CC-BY']),
      blockedLicenses: Object.freeze(['NC', 'unknown', 'unclear-redistribution']),
      recordUsageInLicenses: true,
    }),
    mobile: Object.freeze({
      required: true,
      touchFirst: true,
      virtualJoystick: true,
      safeArea: true,
      responsiveOrientation: true,
      keyboardDefault: false,
    }),
    protectedState: Object.freeze({ rules: keepRules, save: preserveSave, targets: Object.freeze(preserve) }),
    phases: Object.freeze(unique(phases)),
    completion: Object.freeze({
      minimum: ['그래픽 적용', '애니메이션 적용', '모션-판정 동기화', '에셋 라이선스 기록', '모바일 QA', '세이브 회귀 QA'],
      release: godotTarget ? ['Godot 프로젝트 생성', '씬/스크립트 참조 검사', '출시 빌드 검사'] : ['웹 실행 검사'],
    }),
  });
}

if (typeof window !== 'undefined') window.createJaewoonVibeRebuildPlan = createVibeRebuildPlan;
