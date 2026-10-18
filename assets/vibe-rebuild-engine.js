// 파일명: assets/vibe-rebuild-engine.js
// 역할: 기존 게임을 보존하면서 출시 수준으로 개선하기 위한 실행용 리빌드 계획 생성
// 규칙: 기존 규칙/세이브 보존, 그래픽·애니메이션·모션 우선, 실제 코드 수정 전 검사

const VISUAL_WORK = Object.freeze([
  '현재 그래픽 기준선 기록',
  '캐릭터/적/보스/배경/아이템/UI 스타일 분석',
  '목표 스타일 프로필 확정',
  '필요 에셋 목록 생성',
  '기존 에셋 우선 재사용',
  '부족한 에셋만 라이선스 확인 후 교체',
  '크기/비율/색감/광원/외곽선 통일',
]);

const MOTION_WORK = Object.freeze([
  'idle 모션 확인',
  'move 모션 확인',
  'attack 모션 확인',
  'hit 모션 확인',
  'skill 모션 확인',
  'death 모션 확인',
  '애니메이션 프레임/FPS 연결',
  '공격 선행동작→타격→후딜 동기화',
  '피격 반응과 무적 시간 동기화',
  '보스 전용 모션/패턴 연계',
]);

const QUALITY_WORK = Object.freeze([
  '전투 타격감 강화',
  '투사체/충돌/VFX 확인',
  '사운드/효과음 연결',
  'UI/UX 개선',
  '모바일 터치+가상 조이스틱 확인',
  '안전 여백/가로세로 대응 확인',
  '성능/메모리/에셋 용량 검사',
]);

const RELEASE_WORK = Object.freeze([
  '저장/불러오기 회귀 검사',
  '기존 규칙/밸런스 비교',
  '기존 콘텐츠 ID 비교',
  '웹 실행 검사',
  'Godot 씬/스크립트 참조 검사',
  '출시 플랫폼 빌드 검사',
]);

function clean(value) { return String(value ?? '').trim(); }
function lower(value) { return clean(value).toLowerCase(); }
function unique(values) { return [...new Set(values.filter(Boolean))]; }
function hasAny(value, words) { const source = lower(value); return words.some((word) => source.includes(lower(word))); }

function inferScope(request) {
  const text = clean(request);
  const scope = {
    visual: true,
    animation: true,
    motion: true,
    assets: true,
    combat: hasAny(text, ['전투', '공격', '보스', '포탑', '적']),
    ui: hasAny(text, ['ui', '화면', '버튼', '인터페이스']),
    audio: hasAny(text, ['사운드', '소리', '음악', '효과음']),
    mobile: true,
    save: true,
    godot: hasAny(text, ['godot', '고도', '고도버전', '출시']),
  };
  return Object.freeze(scope);
}

function makeChecklist(scope, target) {
  const list = [...VISUAL_WORK, ...MOTION_WORK, ...QUALITY_WORK];
  if (scope.combat) list.push('전투 판정과 모션 프레임 타이밍 대조');
  if (scope.ui) list.push('UI 상태와 게임 상태 동기화');
  if (scope.audio) list.push('오디오 재생/중복 재생/볼륨 회귀');
  if (target === 'godot' || scope.godot) list.push(...RELEASE_WORK.filter((item) => item.includes('Godot') || item.includes('출시')));
  else list.push(...RELEASE_WORK.filter((item) => item === '저장/불러오기 회귀 검사' || item === '기존 규칙/밸런스 비교' || item === '웹 실행 검사'));
  return unique(list);
}

export function createVibeRebuildExecution({ request = '', target = 'auto', gameId = null, currentSnapshot = null, style = null } = {}) {
  const prompt = clean(request);
  if (!prompt) throw new Error('rebuild execution request required');
  const resolvedTarget = target === 'godot' || hasAny(prompt, ['godot', '고도', '고도버전', '출시']) ? 'godot' : 'web';
  const scope = inferScope(prompt);
  const requestedStyle = clean(style) || (hasAny(prompt, ['픽셀', '도트']) ? 'pixel' : hasAny(prompt, ['카툰', '만화', '귀여운']) ? 'cartoon' : hasAny(prompt, ['다크', '어두운']) ? 'dark' : 'match-existing');
  const protectedState = currentSnapshot || Object.freeze({ rules: 'capture-before-change', save: 'preserve-and-migrate-on-break', ids: 'preserve' });
  const checklist = makeChecklist(scope, resolvedTarget);

  return Object.freeze({
    version: 1,
    mode: 'rebuild',
    gameId: gameId ? clean(gameId) : null,
    target: resolvedTarget,
    request: prompt,
    style: Object.freeze({ name: requestedStyle, required: true, applyTo: Object.freeze(['character', 'enemy', 'boss', 'npc', 'background', 'item', 'ui', 'vfx', 'animation']) }),
    priority: Object.freeze(['visual', 'animation', 'motion', 'assets', 'gameplay-feedback', 'ui-ux', 'audio-vfx', 'mobile', 'performance', 'save', 'release']),
    scope,
    protectedState,
    execution: Object.freeze({
      before: Object.freeze(['read-current-project', 'capture-rules', 'capture-save-schema', 'capture-assets', 'capture-style', 'create-checkpoint']),
      apply: Object.freeze(checklist.map((item) => `apply:${item}`)),
      after: Object.freeze(['compare-rules', 'compare-save', 'run-regression', 'run-mobile-qa', 'run-release-qa']),
    }),
    acceptance: Object.freeze({
      graphics: true,
      animation: true,
      motionSync: true,
      assetsLicensed: true,
      existingRulesPreserved: true,
      saveCompatible: true,
      targetBuildReady: resolvedTarget === 'godot',
    }),
  });
}

export const planVibeRebuildExecution = createVibeRebuildExecution;
if (typeof window !== 'undefined') window.createJaewoonVibeRebuildExecution = createVibeRebuildExecution;
