// 파일명: assets/visual-style.js
// 역할: 자연어로 지정한 게임 그래픽 스타일을 캐릭터·적·배경·UI·VFX·애니메이션에 공통 적용하기 위한 스타일 프로필
// 규칙: 게임 로직과 분리, 기존 규칙/세이브 불변, 전체 에셋의 시각적 일관성 우선

const STYLE_WORDS = Object.freeze({
  pixel: ['픽셀', '도트'],
  cartoon: ['카툰', '만화', '귀여운', '캐주얼'],
  realistic: ['현실적', '리얼', '실사', '현실풍'],
  anime: ['애니풍', '애니 스타일', '일본풍'],
  dark: ['다크', '어두운', '암울한'],
  fantasy: ['판타지', '중세', '마법'],
  scifi: ['sf', '미래', '사이버', '기계'],
  handDrawn: ['손그림', '그림체', '수채화'],
});

const PRESETS = Object.freeze({
  pixel: Object.freeze({ family: 'pixel', texture: 'crisp', outline: 'strong', shading: 'stepped', vfx: 'pixel', ui: 'pixel' }),
  cartoon: Object.freeze({ family: 'cartoon', texture: 'clean', outline: 'medium', shading: 'soft', vfx: 'bright', ui: 'rounded' }),
  realistic: Object.freeze({ family: 'realistic', texture: 'detailed', outline: 'minimal', shading: 'smooth', vfx: 'cinematic', ui: 'clean' }),
  anime: Object.freeze({ family: 'anime', texture: 'clean', outline: 'sharp', shading: 'cel', vfx: 'stylized', ui: 'sharp' }),
  dark: Object.freeze({ family: 'dark', texture: 'detailed', outline: 'medium', shading: 'high-contrast', vfx: 'smoke-light', ui: 'dark' }),
  fantasy: Object.freeze({ family: 'fantasy', texture: 'detailed', outline: 'medium', shading: 'painterly', vfx: 'magic', ui: 'ornate' }),
  scifi: Object.freeze({ family: 'scifi', texture: 'clean', outline: 'minimal', shading: 'metallic', vfx: 'energy', ui: 'holographic' }),
  handDrawn: Object.freeze({ family: 'hand-drawn', texture: 'paper', outline: 'organic', shading: 'brush', vfx: 'brush', ui: 'illustrated' }),
});

function text(value) { return String(value ?? '').trim(); }
function lower(value) { return text(value).toLowerCase(); }
function unique(values) { return [...new Set(values.filter(Boolean))]; }

export function inferVisualStyle(request, fallback = 'cartoon') {
  const prompt = lower(request);
  const detected = Object.entries(STYLE_WORDS).filter(([, words]) => words.some((word) => prompt.includes(word.toLowerCase()))).map(([style]) => style);
  return detected[0] || fallback;
}

export function createVisualStyleProfile({ request = '', style = null, overrides = {} } = {}) {
  const resolved = text(style) || inferVisualStyle(request);
  const preset = PRESETS[resolved] || PRESETS.cartoon;
  return Object.freeze({
    version: 1,
    style: resolved,
    request: text(request),
    profile: Object.freeze({ ...preset, ...overrides }),
    applyTo: Object.freeze(['character', 'enemy', 'boss', 'npc', 'background', 'tile', 'item', 'weapon', 'ui', 'vfx', 'animation']),
    consistency: Object.freeze({ palette: true, scale: true, outline: true, lighting: true, vfx: true, ui: true }),
  });
}

if (typeof window !== 'undefined') {
  window.inferJaewoonVisualStyle = inferVisualStyle;
  window.createJaewoonVisualStyleProfile = createVisualStyleProfile;
}
