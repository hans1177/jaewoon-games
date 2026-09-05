// 파일명: assets/visual-style.js
// 역할: 자연어로 지정한 게임 그래픽 스타일을 캐릭터·적·배경·UI·VFX·애니메이션에 공통 적용하기 위한 스타일 프로필
// 규칙: 게임 로직과 분리, 기존 규칙/세이브 불변, 전체 에셋의 시각적 일관성 우선

const STYLE_WORDS = Object.freeze({
  pixel: ['픽셀', '도트', '8비트', '16비트'],
  cartoon: ['카툰', '만화', '귀여운', '캐주얼'],
  realistic: ['현실적', '리얼', '실사', '현실풍'],
  anime: ['애니풍', '애니 스타일', '일본풍'],
  dark: ['다크', '어두운', '암울한'],
  fantasy: ['판타지', '중세', '마법'],
  scifi: ['sf', '미래', '사이버', '기계'],
  handDrawn: ['손그림', '그림체', '수채화'],
});

const MOOD_WORDS = Object.freeze({
  bright: ['밝은', '화사한', '청량한'],
  dark: ['어두운', '음침한', '공포스러운'],
  cute: ['귀여운', '아기자기한'],
  epic: ['웅장한', '장엄한'],
  cozy: ['따뜻한', '포근한'],
  tense: ['긴장감', '긴박한'],
});

const PRESETS = Object.freeze({
  pixel: Object.freeze({ family: 'pixel', texture: 'crisp', outline: 'strong', shading: 'stepped', vfx: 'pixel', ui: 'pixel', motion: 'snappy' }),
  cartoon: Object.freeze({ family: 'cartoon', texture: 'clean', outline: 'medium', shading: 'soft', vfx: 'bright', ui: 'rounded', motion: 'bouncy' }),
  realistic: Object.freeze({ family: 'realistic', texture: 'detailed', outline: 'minimal', shading: 'smooth', vfx: 'cinematic', ui: 'clean', motion: 'weighty' }),
  anime: Object.freeze({ family: 'anime', texture: 'clean', outline: 'sharp', shading: 'cel', vfx: 'stylized', ui: 'sharp', motion: 'snappy' }),
  dark: Object.freeze({ family: 'dark', texture: 'detailed', outline: 'medium', shading: 'high-contrast', vfx: 'smoke-light', ui: 'dark', motion: 'weighty' }),
  fantasy: Object.freeze({ family: 'fantasy', texture: 'detailed', outline: 'medium', shading: 'painterly', vfx: 'magic', ui: 'ornate', motion: 'weighty' }),
  scifi: Object.freeze({ family: 'scifi', texture: 'clean', outline: 'minimal', shading: 'metallic', vfx: 'energy', ui: 'holographic', motion: 'mechanical' }),
  handDrawn: Object.freeze({ family: 'hand-drawn', texture: 'paper', outline: 'organic', shading: 'brush', vfx: 'brush', ui: 'illustrated', motion: 'organic' }),
});

const MOTION_STATES = Object.freeze(['idle', 'move', 'attack', 'hit', 'skill', 'death']);

function text(value) { return String(value ?? '').trim(); }
function lower(value) { return text(value).toLowerCase(); }
function unique(values) { return [...new Set(values.filter(Boolean))]; }
function hasAny(source, words) { return words.some((word) => source.includes(lower(word))); }

export function inferVisualStyle(request, fallback = 'cartoon') {
  const prompt = lower(request);
  const detected = Object.entries(STYLE_WORDS)
    .filter(([, words]) => hasAny(prompt, words))
    .map(([style]) => style);
  return detected[0] || fallback;
}

export function inferVisualMood(request, fallback = 'balanced') {
  const prompt = lower(request);
  const detected = Object.entries(MOOD_WORDS)
    .filter(([, words]) => hasAny(prompt, words))
    .map(([mood]) => mood);
  return detected[0] || fallback;
}

export function createVisualStyleProfile({ request = '', style = null, mood = null, overrides = {} } = {}) {
  const resolvedStyle = text(style) || inferVisualStyle(request);
  const resolvedMood = text(mood) || inferVisualMood(request);
  const preset = PRESETS[resolvedStyle] || PRESETS.cartoon;
  return Object.freeze({
    version: 2,
    style: resolvedStyle,
    mood: resolvedMood,
    request: text(request),
    profile: Object.freeze({ ...preset, ...overrides }),
    applyTo: Object.freeze(['character', 'enemy', 'boss', 'npc', 'background', 'tile', 'item', 'weapon', 'ui', 'vfx', 'animation', 'particles', 'lighting']),
    animation: Object.freeze({
      required: true,
      states: MOTION_STATES,
      gameplaySynchronized: true,
      styleMotion: preset.motion,
    }),
    consistency: Object.freeze({
      palette: true,
      scale: true,
      outline: true,
      lighting: true,
      texture: true,
      vfx: true,
      ui: true,
      animation: true,
      audioMood: true,
    }),
    rules: Object.freeze({
      preserveGameplayLogic: true,
      replaceAssetsWithoutGameplayRewrite: true,
      reuseExistingAssetsFirst: true,
      licenseCheckRequired: true,
      noRandomMixedStyles: true,
    }),
  });
}

export function mergeVisualStyleProfile(base, overrides = {}) {
  const current = createVisualStyleProfile(base || {});
  return createVisualStyleProfile({
    request: current.request,
    style: current.style,
    mood: current.mood,
    overrides: { ...current.profile, ...overrides },
  });
}

export function validateVisualStyleProfile(profile) {
  if (!profile || typeof profile !== 'object') throw new Error('visual style profile required');
  const invalid = ['style', 'mood'].filter((key) => !text(profile[key]));
  if (invalid.length) throw new Error(`visual style profile invalid: ${invalid.join(', ')}`);
  const applyTo = Array.isArray(profile.applyTo) ? profile.applyTo : [];
  const missing = ['character', 'enemy', 'background', 'ui', 'animation'].filter((key) => !applyTo.includes(key));
  return Object.freeze({ valid: missing.length === 0, missingTargets: unique(missing) });
}

if (typeof window !== 'undefined') {
  window.inferJaewoonVisualStyle = inferVisualStyle;
  window.inferJaewoonVisualMood = inferVisualMood;
  window.createJaewoonVisualStyleProfile = createVisualStyleProfile;
  window.mergeJaewoonVisualStyleProfile = mergeVisualStyleProfile;
  window.validateJaewoonVisualStyleProfile = validateVisualStyleProfile;
}
