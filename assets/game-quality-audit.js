// 파일명: assets/game-quality-audit.js
// 역할: 기존 게임의 품질을 시각·애니메이션·모션·게임성·UX·오디오·성능·저장 관점에서 진단
// 규칙: 진단은 기존 게임을 수정하지 않으며, 개선 우선순위만 제시

function clean(value) { return String(value ?? '').trim(); }
function array(value) { return Array.isArray(value) ? value : []; }
function clamp(value, min = 0, max = 100) { return Math.max(min, Math.min(max, Number(value) || 0)); }
function hasAny(text, words) { const source = clean(text).toLowerCase(); return words.some((word) => source.includes(String(word).toLowerCase())); }

const CATEGORIES = Object.freeze({
  visual: ['그래픽', '에셋', '배경', '캐릭터', '적', '보스', '아이템', 'UI'],
  animation: ['애니', '애니메이션', '모션', '걷기', '공격', '피격', '사망', '스킬'],
  gameplay: ['전투', '공격', '웨이브', '보스', '퀘스트', '제작', '레벨', '상점'],
  ux: ['버튼', '터치', '조이스틱', '모바일', '여백', '스크롤', '화면'],
  audio: ['음악', '사운드', '효과음', 'BGM', 'SFX'],
  performance: ['성능', '프레임', 'FPS', '버벅', '느려'],
  save: ['저장', '세이브', '불러오기', '자동저장'],
});

function auditContent(content = {}, prompt = '') {
  const enemies = array(content.enemies);
  const items = array(content.items);
  const crafting = array(content.crafting);
  const waves = content.waves || {};
  const text = clean(prompt);
  const visual = enemies.length || items.length || content.map ? 60 : 25;
  const animation = hasAny(text, CATEGORIES.animation) ? 70 : 30;
  const gameplay = Number(waves.total) > 1 || enemies.length > 1 || crafting.length > 0 ? 70 : 40;
  const ux = hasAny(text, CATEGORIES.ux) ? 75 : 45;
  const audio = hasAny(text, CATEGORIES.audio) ? 70 : 30;
  const performance = 60;
  const save = hasAny(text, CATEGORIES.save) || content.save ? 70 : 35;
  return { visual, animation, gameplay, ux, audio, performance, save };
}

function suggestions(scores) {
  const ranked = Object.entries(scores).sort((a, b) => a[1] - b[1]);
  const names = { visual: '그래픽/에셋 통일 및 교체', animation: '캐릭터·적·보스 모션 추가', gameplay: '전투·웨이브·보스·보상 흐름 강화', ux: '모바일 터치·조이스틱·화면 구성 개선', audio: 'BGM·효과음·환경음 연결', performance: '프레임·렌더링·스폰 성능 최적화', save: '세이브 버전·복원·회귀 검사 강화' };
  return ranked.slice(0, 5).map(([key, score]) => ({ category: key, score: clamp(score), action: names[key] }));
}

export function auditGameQuality({ packageData = null, prompt = '' } = {}) {
  const data = packageData?.content || packageData || {};
  const scores = auditContent(data, prompt || packageData?.blueprint?.sourcePrompt || packageData?.blueprint?.prompt || '');
  const average = Object.values(scores).reduce((sum, score) => sum + score, 0) / Object.keys(scores).length;
  return Object.freeze({
    version: 1,
    overall: Math.round(average),
    scores: Object.freeze(Object.fromEntries(Object.entries(scores).map(([key, value]) => [key, Math.round(clamp(value))]))),
    priority: Object.freeze(suggestions(scores)),
    requiredBaseline: Object.freeze({ visual: true, animation: true, motionGameplaySync: true, mobileTouch: true, virtualJoystick: true, safeArea: true, responsiveOrientation: true }),
    preserve: Object.freeze({ gameplayRules: true, balance: true, save: true, progression: true }),
  });
}

export const inspectGameQuality = auditGameQuality;

if (typeof window !== 'undefined') {
  window.auditJaewoonGameQuality = auditGameQuality;
  window.inspectJaewoonGameQuality = inspectGameQuality;
}
