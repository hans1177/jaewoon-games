// 파일명: assets/godot-conversion-plan.js
// 역할: 기존 웹게임을 Godot 게임 프로젝트로 재구성하기 위한 상세 매핑 계획
// 규칙: 웹게임 규칙/세이브 보존, Godot 구조로 재구성, 그래픽·애니·모션 우선

const NODE_MAP = Object.freeze({
  game: 'Node',
  world: 'Node2D',
  actor: 'CharacterBody2D 또는 Node2D',
  enemy: 'CharacterBody2D 또는 Node2D',
  projectile: 'Area2D',
  hitbox: 'Area2D',
  ui: 'CanvasLayer + Control',
  joystick: 'TouchScreenButton 또는 커스텀 Control',
  animation: 'AnimatedSprite2D 또는 AnimationPlayer',
  audio: 'AudioStreamPlayer',
});

const SCRIPT_MAP = Object.freeze({
  combat: 'combat.gd',
  wave: 'wave_manager.gd',
  input: 'mobile_input.gd',
  save: 'save_manager.gd',
  animation: 'animation_controller.gd',
  effects: 'vfx_controller.gd',
  ui: 'hud.gd',
});

function text(value) { return String(value ?? '').trim(); }
function unique(values) { return [...new Set(values.filter(Boolean))]; }
function hasAny(value, words) { const source = text(value).toLowerCase(); return words.some((word) => source.includes(String(word).toLowerCase())); }

export function createGodotConversionPlan({ prompt = '', webGameId = '', releasePlatforms = ['android', 'windows', 'web'], preserveSave = true, preserveRules = true } = {}) {
  const request = text(prompt);
  if (!request) throw new Error('godot conversion request required');
  const systems = [];
  if (hasAny(request, ['공격', '전투', '포탑', '투사체', '보스'])) systems.push('combat');
  if (hasAny(request, ['웨이브', '스폰'])) systems.push('wave');
  if (hasAny(request, ['터치', '조이스틱', '모바일'])) systems.push('input');
  if (hasAny(request, ['저장', '세이브', '이어하기'])) systems.push('save');
  if (hasAny(request, ['애니', '애니메이션', '모션'])) systems.push('animation');
  if (hasAny(request, ['이펙트', '파티클', '폭발'])) systems.push('effects');
  systems.push('ui');

  const sceneTree = [
    'Main.tscn',
    'Main/World',
    'Main/World/Player',
    'Main/World/Enemies',
    'Main/World/Projectiles',
    'Main/UI',
    'Main/UI/MobileControls',
  ];

  const migration = preserveSave ? [
    '웹 세이브 키와 gameId 기록',
    '웹 저장 데이터 필드 매핑표 생성',
    'Godot user:// 저장 구조 설계',
    '기존 데이터 변환 함수 작성',
    '변환 실패 시 원본 세이브 보존',
  ] : [];

  return Object.freeze({
    version: 1,
    webGameId: text(webGameId) || null,
    target: 'godot',
    releasePlatforms: Object.freeze(unique(releasePlatforms.map(text))),
    preserve: Object.freeze({ rules: preserveRules, save: preserveSave }),
    nodeMap: NODE_MAP,
    scriptMap: Object.freeze(Object.fromEntries(unique(systems).map((system) => [system, SCRIPT_MAP[system] || `${system}.gd`]))),
    sceneTree: Object.freeze(sceneTree),
    systems: Object.freeze(unique(systems)),
    assetPipeline: Object.freeze([
      '웹에서 실제 사용 에셋 목록 추출',
      '기존 저장소 에셋 우선 재사용',
      'Godot import 설정 적용',
      '텍스처 크기·압축·필터링 점검',
      '라이선스 기록 유지',
    ]),
    animationPipeline: Object.freeze([
      'idle/move/attack/hit/skill/death 상태 정의',
      '실제 스프라이트 프레임 수 등록',
      'AnimationPlayer 또는 AnimatedSprite2D 연결',
      '모션과 공격 판정 타이밍 동기화',
      '사망/피격/스킬 원샷 애니메이션 종료 처리',
    ]),
    mobilePipeline: Object.freeze([
      '가상 조이스틱 입력',
      '터치 액션 버튼',
      'Safe Area 적용',
      '세로/가로 자동 대응',
      '노치/홈바 영역 검사',
    ]),
    migration: Object.freeze(migration),
    qa: Object.freeze([
      '씬 참조 무결성',
      '스크립트 오류',
      '에셋 누락',
      '애니메이션 프레임/전환',
      '모션-판정 동기화',
      '입력',
      '저장/복원',
      '재시작',
      '해상도/방향',
      '성능',
      'Android 내보내기',
      'Windows 내보내기',
      'Web 내보내기',
    ]),
  });
}

if (typeof window !== 'undefined') window.createJaewoonGodotConversionPlan = createGodotConversionPlan;
