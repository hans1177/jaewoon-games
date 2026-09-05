// 파일명: assets/vibe-helper.js
// 역할: 자연어 바이브코딩 요청을 안전한 작업 명세로 정규화
// 규칙: 기존 게임 자동 변경 금지, 실제 수정 전 영향 범위와 QA를 먼저 산출

const SYSTEM_RULES = Object.freeze([
  ['전투', ['공격', '데미지', '피해', '명중', '치명타', '투사체', '원거리', '근접', '넉백', '기절', '슬로우'], 'assets/combat-actions.js'],
  ['체력', ['체력', 'hp', '회복', '방패', '무적', '사망', '부활'], 'assets/combat-vitals.js'],
  ['웨이브', ['웨이브', '스폰', '적이 나와', '보스가 나와', '보스'], 'assets/wave-spawner.js'],
  ['생존', ['생존', '낮', '밤', '허기', '갈증', '체온', '채집'], 'assets/day-night-cycle.js'],
  ['입력', ['조이스틱', '터치', '버튼', '모바일', '이동'], 'assets/input-actions.js'],
  ['아이템', ['아이템', '장비', '무기', '방어구', '인벤토리'], 'assets/inventory-equipment.js'],
  ['제작', ['제작', '레시피', '재료', '만들기'], 'assets/crafting-recipes.js'],
  ['퀘스트', ['퀘스트', '목표', '미션', '대화'], 'assets/quest-dialogue.js'],
  ['스킬', ['스킬', '필살기', '특수기', '쿨타임', '버프', '디버프'], 'assets/skill-effects.js'],
  ['보상', ['보상', '골드', '돈', '드랍', '드롭'], 'assets/economy-loot-shop.js'],
  ['성장', ['레벨', '경험치', '성장', '스탯', '스킬 포인트'], 'assets/character-progression.js'],
  ['세이브', ['저장', '불러오기', '세이브', '진행도'], 'assets/save-versioning.js'],
  ['씬', ['맵', '화면', '씬', '스테이지', '로비'], 'assets/scene-flow.js'],
]);

const PROTECTED_RULES = Object.freeze(['체력', '공격력', '웨이브', '보상', '드랍률', '저장 키', '진행도', '플레이 규칙']);

function text(value) {
  return String(value || '').trim();
}

function hasAny(source, words) {
  const value = source.toLowerCase();
  return words.some((word) => value.includes(word.toLowerCase()));
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function detectMode(prompt) {
  const value = prompt.toLowerCase();
  if (hasAny(value, ['버그', '오류', '안 돼', '멈춰', '고장', '에러', '깨져'])) return 'fix';
  if (hasAny(value, ['바꿔', '수정', '변경', '고쳐'])) return 'change';
  if (hasAny(value, ['추가', '넣어', '만들어', '넣기'])) return 'feature';
  return 'inspect';
}

function detectPriority(prompt) {
  const value = prompt.toLowerCase();
  if (hasAny(value, ['급해', '막혀', '게임이 안 돼', '치명적', '크래시', '멈춰'])) return 'critical';
  if (hasAny(value, ['오류', '버그', '안 돼', '문제'])) return 'high';
  if (hasAny(value, ['불편', '느려', '깨짐'])) return 'medium';
  return 'normal';
}

function protectFlags(prompt) {
  const value = prompt.toLowerCase();
  const flags = [];
  for (const rule of PROTECTED_RULES) {
    if (value.includes(rule.toLowerCase())) flags.push(rule);
  }
  return flags;
}

export function planVibeCodingTask({ prompt = '', currentGame = null, currentFile = null } = {}) {
  const request = text(prompt);
  if (!request) throw new Error('vibe helper prompt required');

  const affectedSystems = [];
  const files = [];
  for (const [system, words, file] of SYSTEM_RULES) {
    if (hasAny(request, words)) {
      affectedSystems.push(system);
      files.push(file);
    }
  }

  const mobileRequested = hasAny(request, ['모바일', '핸드폰', '휴대폰', '조이스틱', '터치']);
  if (mobileRequested || affectedSystems.includes('입력')) {
    affectedSystems.push('모바일 기본 화면');
  }

  const mode = detectMode(request);
  const priority = detectPriority(request);
  const protectedTargets = protectFlags(request);
  const qa = unique([
    '로딩/시작',
    '진행 막힘',
    '버튼/터치',
    '저장/불러오기',
    '일시정지/재시작',
    '콘솔 오류',
    '모바일 화면',
    ...(affectedSystems.includes('전투') ? ['전투 적중/피해/사망'] : []),
    ...(affectedSystems.includes('웨이브') ? ['스폰/웨이브 종료/보스'] : []),
    ...(affectedSystems.includes('세이브') ? ['세이브 버전/기존 데이터 보호'] : []),
  ]);

  const warnings = [];
  if (protectedTargets.length) warnings.push(`보존 대상 확인 필요: ${protectedTargets.join(', ')}`);
  if (!currentGame) warnings.push('대상 게임이 지정되지 않음: 실제 게임 수정 전에 파일/규칙 확인 필요');
  if (files.length === 0) warnings.push('정확한 영향 파일이 특정되지 않음: 기존 코드를 먼저 읽어야 함');
  if (mode === 'fix') warnings.push('수정 전 재현 → 원인 파일 확인 → 직접 수정 → 회귀 QA 순서 권장');

  const steps = unique([
    '현재 main 기준 대상 파일 확인',
    '기존 규칙/저장 구조 확인',
    affectedSystems.length ? `필요 시스템 확인: ${affectedSystems.join(', ')}` : '필요 시스템 판단',
    '가장 작은 범위로 원본 구조 직접 수정',
    '전용 기능 테스트',
    ...qa.map((item) => `QA: ${item}`),
    '임시 파일/테스트 흔적 제거',
  ]);

  return Object.freeze({
    version: 1,
    request,
    mode,
    priority,
    currentGame: currentGame ? text(currentGame) : null,
    currentFile: currentFile ? text(currentFile) : null,
    affectedSystems: unique(affectedSystems),
    candidateFiles: unique(files),
    protectedTargets,
    mobileDefaults: Object.freeze({
      touchFirst: true,
      virtualJoystick: true,
      safeArea: true,
      responsiveOrientation: true,
      keyboardOptional: true,
    }),
    steps: Object.freeze(steps),
    qa: Object.freeze(qa),
    warnings: Object.freeze(warnings),
  });
}

if (typeof window !== 'undefined') window.planJaewoonVibeCodingTask = planVibeCodingTask;
