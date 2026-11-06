// 파일명: assets/godot-release-plan.js
// 역할: 웹 프로토타입/기존 웹게임을 Godot 출시 프로젝트로 전환하는 공통 계획
// 규칙: 기존 게임 규칙·세이브 보호, 실제 코드/에셋 확인 후 변환, 출시 전 플랫폼별 검증

const PROTECTED = Object.freeze([
  '체력', '공격력', '웨이브', '보상', '드랍률', '저장 키', '진행도', '플레이 규칙',
]);

function text(value) { return String(value ?? '').trim(); }
function hasAny(value, words) {
  const source = text(value).toLowerCase();
  return words.some((word) => source.includes(String(word).toLowerCase()));
}
function unique(values) { return [...new Set(values.filter(Boolean))]; }

export function createGodotReleasePlan({ request = '', sourceType = 'web', projectId = null, currentGame = false } = {}) {
  const prompt = text(request);
  if (!prompt) throw new Error('godot release request required');

  const protectedTargets = PROTECTED.filter((value) => prompt.includes(value));
  const exportTargets = [];
  if (hasAny(prompt, ['안드로이드', 'android', '폰', '모바일']) || !hasAny(prompt, ['윈도우', 'windows', '웹', 'web'])) exportTargets.push('android');
  if (hasAny(prompt, ['윈도우', 'windows', 'pc', '컴퓨터'])) exportTargets.push('windows');
  if (hasAny(prompt, ['웹', 'web', '브라우저'])) exportTargets.push('web');
  if (!exportTargets.length) exportTargets.push('android', 'windows', 'web');

  const sourceSteps = sourceType === 'godot'
    ? ['Godot project.godot 확인', '씬/스크립트/리소스 참조 확인']
    : ['기존 웹게임 HTML/JS/CSS 기능 목록화', '웹 전용 구현과 게임 규칙을 분리', 'Godot 씬/노드/스크립트 구조로 재설계'];

  const phases = unique([
    '현재 main과 대상 게임의 실제 최신 코드 확인',
    'PROJECT_HANDOFF.md / GAME_RULES.md / ASSET_RULES.md / LICENSES.md 확인',
    ...sourceSteps,
    '현재 게임 규칙·밸런스·저장 구조 스냅샷 작성',
    '기존 에셋 우선 재사용 및 라이선스 확인',
    'Godot 4.7.2 안정판 프로젝트 구성',
    '입력: 터치 + 가상 조이스틱 + 필요한 액션 버튼 구현',
    '화면: 안전 여백 + 세로/가로 자동 대응 구현',
    '게임 루프·전투·웨이브·제작·인벤토리·세이브를 Godot 구조에 연결',
    '애니메이션 상태와 실제 프레임/블렌드 연결',
    '오디오/VFX/UI 연결',
    '기존 세이브가 있는 경우 마이그레이션 경로 검증',
    '기능별 테스트와 모바일 플레이 테스트',
    '플랫폼별 export preset 및 아이콘/패키지 설정',
    '출시 빌드 생성 및 실행 검증',
    '최종 회귀 QA',
  ]);

  const qa = unique([
    '첫 실행/로딩', '씬 전환', '터치 입력', '조이스틱', '버튼 중복 입력 방지',
    '화면 안전영역', '세로/가로 회전', '저장/불러오기', '기존 세이브 호환',
    '게임 종료/재실행', '전투/피해/사망', '웨이브/보스', '제작/재료 차감',
    '인벤토리/장비', '애니메이션 상태 전환', '사운드/VFX', '성능/메모리',
    '에셋 누락/경로', '콘솔/런타임 오류', '출시 빌드 설치/실행',
  ]);

  const warnings = [];
  if (currentGame) warnings.push('기존 게임은 웹 기능을 그대로 복사하지 말고 규칙/데이터와 표현 계층을 분리해 재구성');
  if (protectedTargets.length) warnings.push(`보존 대상: ${protectedTargets.join(', ')} → 현재값을 먼저 기록하고 임의 변경 금지`);
  warnings.push('Godot 전환 중 원본 웹게임의 정상 버전을 보존해야 함');
  warnings.push('웹 export는 Godot 프로젝트 검증용으로 사용하고 최종 모바일 성능은 네이티브 Android 빌드에서도 확인');

  return Object.freeze({
    version: 1,
    engine: 'godot',
    godotVersion: '4.7.2-stable',
    sourceType: sourceType === 'godot' ? 'godot' : 'web',
    projectId: projectId ? text(projectId) : null,
    currentGame: Boolean(currentGame),
    exportTargets: Object.freeze(exportTargets),
    protectedTargets: Object.freeze(protectedTargets),
    phases: Object.freeze(phases),
    qa: Object.freeze(qa),
    mobileDefaults: Object.freeze({
      touchFirst: true,
      virtualJoystick: true,
      safeArea: true,
      responsiveOrientation: true,
      keyboardDefault: false,
    }),
    policy: Object.freeze({
      preserveOriginalWebBuild: true,
      directSourceRebuildPreferred: true,
      saveMigrationRequiredForBreakingChange: true,
      licenseCheckRequired: true,
      finalReleaseEngine: 'godot',
    }),
    warnings: Object.freeze(warnings),
  });
}

export const planGodotRelease = createGodotReleasePlan;
if (typeof window !== 'undefined') window.createJaewoonGodotReleasePlan = createGodotReleasePlan;
