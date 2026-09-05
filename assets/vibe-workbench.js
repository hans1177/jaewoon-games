// 파일명: assets/vibe-workbench.js
// 역할: 웹/Godot 게임의 자연어 개발·수정·복구 작업을 하나의 안전한 작업계획으로 정규화
// 규칙: 기존 코드 확인 우선, 기존 세이브/밸런스 보호, 작은 범위 직접 수정, QA 후 적용

const TARGET_WORDS = Object.freeze({
  godot: ['godot', '고도', '씬', 'project.godot', 'gdscript', '.gd'],
  web: ['웹', '웹게임', 'html', 'css', 'javascript', '자바스크립트', '브라우저', '모바일 웹'],
});

const TASK_WORDS = Object.freeze({
  repair: ['오류', '버그', '고장', '멈춰', '안 돼', '에러', '크래시', '깨져', '복구'],
  change: ['수정', '바꿔', '변경', '고쳐', '개선'],
  feature: ['추가', '넣어', '만들어', '구현'],
  balance: ['체력', '공격력', '데미지', '웨이브', '보상', '드랍률', '속도', '쿨타임'],
  mobile: ['모바일', '핸드폰', '휴대폰', '터치', '조이스틱', '스마트폰'],
  save: ['저장', '세이브', '불러오기', '진행도'],
});

const PROTECTED = Object.freeze(['체력', '공격력', '웨이브', '보상', '드랍률', '저장 키', '진행도', '플레이 규칙']);

function clean(value) {
  return String(value ?? '').trim();
}

function hasAny(value, words) {
  const source = clean(value).toLowerCase();
  return words.some((word) => source.includes(String(word).toLowerCase()));
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function targetOf(request, explicitTarget = 'auto') {
  if (explicitTarget === 'godot' || explicitTarget === 'web') return explicitTarget;
  if (hasAny(request, TARGET_WORDS.godot)) return 'godot';
  return 'web';
}

function modeOf(request) {
  if (hasAny(request, TASK_WORDS.repair)) return 'repair';
  if (hasAny(request, TASK_WORDS.change)) return 'change';
  if (hasAny(request, TASK_WORDS.feature)) return 'feature';
  return 'inspect';
}

function priorityOf(request) {
  if (hasAny(request, ['크래시', '게임이 안 돼', '멈춰', '진행이 막힘'])) return 'critical';
  if (hasAny(request, TASK_WORDS.repair)) return 'high';
  if (hasAny(request, ['느려', '불편', '깨짐'])) return 'medium';
  return 'normal';
}

function detectSystems(request) {
  const systems = [];
  if (hasAny(request, ['공격', '피해', '데미지', '투사체', '원거리', '근접', '넉백', '기절', '슬로우'])) systems.push('전투');
  if (hasAny(request, TASK_WORDS.balance)) systems.push('밸런스/규칙');
  if (hasAny(request, TASK_WORDS.mobile)) systems.push('모바일 입력/레이아웃');
  if (hasAny(request, TASK_WORDS.save)) systems.push('저장/복원');
  if (hasAny(request, ['인벤토리', '아이템', '장비', '무기', '방어구'])) systems.push('인벤토리/장비');
  if (hasAny(request, ['제작', '레시피', '재료'])) systems.push('제작');
  if (hasAny(request, ['퀘스트', '미션', '대화', 'NPC'])) systems.push('퀘스트/대화');
  if (hasAny(request, ['스킬', '필살기', '버프', '디버프'])) systems.push('스킬/효과');
  if (hasAny(request, ['골드', '돈', '상점', '보상', '드랍', '드롭'])) systems.push('경제/보상');
  if (hasAny(request, ['웨이브', '스폰', '보스', '적이 나와'])) systems.push('웨이브/스폰');
  return unique(systems);
}

function candidateFiles(target, systems) {
  const files = [];
  if (target === 'godot') {
    files.push('godot-games/<slug>/project.godot');
    if (systems.includes('전투')) files.push('godot-games/<slug>/*.gd');
    if (systems.includes('모바일 입력/레이아웃')) files.push('godot-games/<slug>/*.tscn');
  } else {
    files.push('web-games/<slug>/index.html');
    if (systems.includes('모바일 입력/레이아웃') || systems.includes('전투') || systems.includes('저장/복원')) files.push('assets/*.js 또는 게임 전용 JS');
  }
  return unique(files);
}

export function planVibeWorkbenchTask({
  request = '',
  target = 'auto',
  gameId = null,
  file = null,
  knownBroken = false,
} = {}) {
  const prompt = clean(request);
  if (!prompt) throw new Error('workbench request required');

  const resolvedTarget = targetOf(prompt, target);
  const mode = modeOf(prompt);
  const priority = priorityOf(prompt);
  const systems = detectSystems(prompt);
  const protectedTargets = PROTECTED.filter((rule) => prompt.includes(rule));
  const candidates = candidateFiles(resolvedTarget, systems);

  const steps = [
    '현재 main 기준 대상 게임/파일 확인',
    resolvedTarget === 'godot' ? 'Godot project.godot와 관련 씬/스크립트 구조 확인' : '웹게임 index.html 및 연결된 공통/게임 전용 JS 확인',
    '현재 게임 규칙·밸런스·저장 구조 확인',
  ];

  if (mode === 'repair' || knownBroken) steps.push('오류 재현 조건과 실제 실패 지점 확인');
  if (systems.length) steps.push(`영향 시스템 확인: ${systems.join(', ')}`);
  steps.push('변경 범위를 최소화해 원본 책임 파일 직접 수정');
  if (mode === 'repair') steps.push('원인 수정 후 같은 오류 재발 조건 재검사');
  steps.push('전용 기능 테스트', '로딩/시작', '진행 막힘', '터치/버튼', '저장/불러오기', '일시정지/재시작', '콘솔/런타임 오류', '모바일 화면', '최종 회귀 QA');
  if (resolvedTarget === 'godot') steps.push('Godot 씬/스크립트 참조 및 저장 구조 회귀 확인');
  if (mode === 'feature') steps.push('새 기능이 기존 규칙/세이브를 변경하지 않았는지 확인');
  steps.push('임시 테스트 파일/워크플로 제거');

  const warnings = [];
  if (!gameId) warnings.push('대상 게임 ID가 아직 지정되지 않음');
  if (!file && candidates.length) warnings.push('실제 수정 전 후보 파일을 읽어 정확한 책임 파일을 확정해야 함');
  if (protectedTargets.length) warnings.push(`보존 대상이 요청에 포함됨: ${protectedTargets.join(', ')}. 현재 값을 먼저 기록하고 임의 변경 금지`);
  if (mode === 'repair') warnings.push('증상만 덮는 우회 패치 금지. 원인 위치를 직접 수정해야 함');
  if (resolvedTarget === 'godot') warnings.push('Godot 바이너리 실행 검증이 가능한 환경인지 별도 확인 필요');

  return Object.freeze({
    version: 1,
    request: prompt,
    target: resolvedTarget,
    mode,
    priority,
    gameId: gameId ? clean(gameId) : null,
    file: file ? clean(file) : null,
    knownBroken: Boolean(knownBroken),
    affectedSystems: Object.freeze(systems),
    candidateFiles: Object.freeze(candidates),
    protectedTargets: Object.freeze(protectedTargets),
    mobileDefaults: Object.freeze({
      touchFirst: true,
      virtualJoystick: true,
      safeArea: true,
      responsiveOrientation: true,
      keyboardDefault: false,
    }),
    steps: Object.freeze(unique(steps)),
    warnings: Object.freeze(unique(warnings)),
    applyPolicy: Object.freeze({
      existingGameAutoApply: false,
      saveMigrationRequiredForBreakingChange: true,
      reviewBeforeCommit: true,
    }),
  });
}

export const inspectVibeWorkbenchRequest = planVibeWorkbenchTask;

if (typeof window !== 'undefined') {
  window.planJaewoonVibeWorkbenchTask = planVibeWorkbenchTask;
}
