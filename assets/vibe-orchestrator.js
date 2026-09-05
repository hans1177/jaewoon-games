// 파일명: assets/vibe-orchestrator.js
// 역할: 자연어 기반 바이브코딩 작업의 공통 오케스트레이션 계획
// 규칙: 기존 코드 확인 우선, 원본 책임 파일 직접 수정, 세이브/밸런스 보호, QA 후 적용

const WORDS = Object.freeze({
  create: ['만들어', '새 게임', '제작', '생성'],
  edit: ['수정', '바꿔', '변경', '고쳐', '개선'],
  repair: ['오류', '버그', '고장', '멈춰', '안 돼', '에러', '크래시', '깨져', '복구'],
  test: ['테스트', '검사', 'qa', '확인'],
  web: ['웹', '웹게임', 'html', 'css', 'javascript', '브라우저'],
  godot: ['godot', '고도', 'gdscript', '.gd', 'project.godot', '씬'],
  mobile: ['모바일', '핸드폰', '휴대폰', '스마트폰', '터치', '조이스틱'],
  save: ['저장', '세이브', '불러오기', '진행도'],
  balance: ['체력', '공격력', '데미지', '웨이브', '보상', '드랍률', '속도', '쿨타임'],
  ui: ['버튼', '화면', '여백', '레이아웃', '스크롤', '화면 잘림'],
});

const PROTECTED = Object.freeze(['체력', '공격력', '웨이브', '보상', '드랍률', '저장 키', '진행도', '플레이 규칙']);

function clean(value) { return String(value ?? '').trim(); }
function lower(value) { return clean(value).toLowerCase(); }
function hasAny(value, words) { const source = lower(value); return words.some((word) => source.includes(lower(word))); }
function unique(values) { return [...new Set(values.filter(Boolean))]; }

function detectIntent(request) {
  const results = [];
  if (hasAny(request, WORDS.create)) results.push('create');
  if (hasAny(request, WORDS.edit)) results.push('edit');
  if (hasAny(request, WORDS.repair)) results.push('repair');
  if (hasAny(request, WORDS.test)) results.push('test');
  return results.length ? results : ['inspect'];
}

function detectTarget(request, target = 'auto') {
  if (target === 'web' || target === 'godot') return target;
  if (hasAny(request, WORDS.godot)) return 'godot';
  return 'web';
}

function detectSystems(request) {
  const systems = [];
  if (hasAny(request, ['공격', '피해', '데미지', '투사체', '원거리', '근접', '넉백', '기절', '슬로우'])) systems.push('combat');
  if (hasAny(request, WORDS.balance)) systems.push('balance');
  if (hasAny(request, WORDS.mobile)) systems.push('mobile');
  if (hasAny(request, WORDS.save)) systems.push('save');
  if (hasAny(request, ['아이템', '장비', '무기', '방어구', '인벤토리'])) systems.push('inventory');
  if (hasAny(request, ['제작', '레시피', '재료'])) systems.push('crafting');
  if (hasAny(request, ['퀘스트', '미션', '대화', 'NPC'])) systems.push('quest');
  if (hasAny(request, ['스킬', '필살기', '버프', '디버프'])) systems.push('skill');
  if (hasAny(request, ['골드', '돈', '상점', '보상', '드랍', '드롭'])) systems.push('economy');
  if (hasAny(request, ['웨이브', '스폰', '보스', '적이 나와'])) systems.push('wave');
  if (hasAny(request, WORDS.ui)) systems.push('ui');
  return unique(systems);
}

function candidateFiles(target, systems) {
  if (target === 'godot') {
    return unique([
      'godot-games/<slug>/project.godot',
      ...systems.filter((system) => system === 'mobile' || system === 'ui').map(() => 'godot-games/<slug>/*.tscn'),
      ...systems.filter((system) => system !== 'mobile' && system !== 'ui').map(() => 'godot-games/<slug>/*.gd'),
    ]);
  }
  return unique([
    'web-games/<slug>/index.html',
    ...(systems.length ? ['게임 전용 JS/CSS'] : []),
    ...systems.filter((system) => ['combat', 'wave', 'save'].includes(system)).map(() => 'assets/*.js'),
  ]);
}

function buildQa({ target, systems, intent }) {
  const qa = ['로딩/시작', '진행 막힘', '터치 버튼', '조이스틱', '저장/불러오기', '일시정지/재시작', '콘솔 오류', '모바일 화면', '안전 여백', '가로/세로 자동 대응'];
  if (systems.includes('combat')) qa.push('전투 적중/피해/사망');
  if (systems.includes('wave')) qa.push('스폰/웨이브 종료/보스');
  if (systems.includes('balance')) qa.push('요청 수치 보존/적용');
  if (systems.includes('inventory')) qa.push('장비 장착/해제');
  if (systems.includes('crafting')) qa.push('재료 차감/제작 결과/롤백');
  if (systems.includes('quest')) qa.push('퀘스트 진행/완료/보상');
  if (systems.includes('save')) qa.push('세이브 버전/게임 ID/기존 데이터');
  if (target === 'godot') qa.push('Godot 씬 참조/스크립트 오류');
  if (intent.includes('repair')) qa.push('오류 재현 조건 재확인');
  if (intent.includes('edit')) qa.push('수정 전후 회귀 비교');
  return unique(qa);
}

export function createVibeWorkPlan({ request = '', target = 'auto', gameId = null, file = null, knownBroken = false } = {}) {
  const prompt = clean(request);
  if (!prompt) throw new Error('vibe orchestrator request required');

  const intents = detectIntent(prompt);
  const resolvedTarget = detectTarget(prompt, target);
  const systems = detectSystems(prompt);
  const protectedTargets = PROTECTED.filter((rule) => lower(prompt).includes(lower(rule)));
  const candidates = candidateFiles(resolvedTarget, systems);
  const qa = buildQa({ target: resolvedTarget, systems, intent: intents });

  const steps = [
    '현재 main 최신 상태 확인',
    'PROJECT_HANDOFF.md / GAME_RULES.md / ASSET_RULES.md / LICENSES.md 확인',
    resolvedTarget === 'godot' ? 'Godot 프로젝트 구조와 참조 관계 확인' : '웹게임 HTML과 연결된 JS/CSS 및 공통 시스템 확인',
    '현재 게임 규칙·밸런스·저장 구조 기록',
  ];
  if (intents.includes('repair') || knownBroken) steps.push('오류 재현 및 최초 실패 지점 특정');
  if (systems.length) steps.push(`영향 시스템 확인: ${systems.join(', ')}`);
  if (intents.includes('create')) steps.push('새 게임의 필요한 공통 시스템/에셋/QA 범위 결정');
  if (intents.includes('edit')) steps.push('수정 요청을 기존 구현 책임 함수에 연결');
  steps.push('원본 책임 파일을 직접 최소 범위 수정', '전용 기능 테스트', ...qa.map((item) => `QA: ${item}`), '임시 테스트 파일/워크플로 제거');

  const warnings = [];
  if (!gameId) warnings.push('대상 게임 ID를 작업 직전에 확정');
  if (!file) warnings.push('후보 파일은 실제 코드를 읽은 뒤 확정');
  if (protectedTargets.length) warnings.push(`보존 대상: ${protectedTargets.join(', ')} → 기존 값을 먼저 기록하고 임의 변경 금지`);
  if (intents.includes('repair')) warnings.push('증상만 숨기는 임시 래퍼/override 금지');
  if (intents.includes('edit') && !intents.includes('repair')) warnings.push('기존 저장과 진행도 회귀를 반드시 비교');

  return Object.freeze({
    version: 1,
    request: prompt,
    intents: Object.freeze(intents),
    target: resolvedTarget,
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
    qa: Object.freeze(qa),
    warnings: Object.freeze(unique(warnings)),
    policy: Object.freeze({
      existingGameAutoApply: false,
      directSourceEditPreferred: true,
      saveMigrationRequiredForBreakingChange: true,
      reviewBeforeCommit: true,
    }),
  });
}

export const inspectVibeWorkPlan = createVibeWorkPlan;
if (typeof window !== 'undefined') window.createJaewoonVibeWorkPlan = createVibeWorkPlan;
