// 파일명: assets/vibe-engine-adapter.js
// 역할: Vibe2의 엔진별 책임 경로·검증·빌드 규칙을 하나의 계약으로 정규화한다.
// 원칙: 공통 의미 모델은 유지하고 실제 파일/빌드 차이만 어댑터가 담당한다.

const clean = (value) => String(value ?? '').trim();
const freeze = (value) => Object.freeze(value);
const freezeList = (value = []) => freeze([...new Set(value.map(clean).filter(Boolean))]);

export const VIBE_ENGINE_TARGETS = freeze(['web', 'godot', 'unity', 'unreal']);

const TARGET_WORDS = freeze({
  unreal: freeze(['unreal', '언리얼', 'ue5', 'ue 5', 'uproject', 'blueprint', '블루프린트', 'animation blueprint', 'anim blueprint', 'control rig', 'ik retargeter']),
  unity: freeze(['unity', '유니티', 'c#', '.cs', 'urp', 'unity android', '유니티 안드로이드']),
  godot: freeze(['godot', '고도', 'gdscript', 'project.godot', '.tscn', '.gd']),
  web: freeze(['웹', 'web', 'html', 'css', 'javascript', '브라우저'])
});

function hasAny(value, words) {
  const text = clean(value).toLowerCase();
  return words.some((word) => text.includes(clean(word).toLowerCase()));
}

export function normalizeVibeEngineTarget(target = 'auto') {
  const value = clean(target).toLowerCase();
  return VIBE_ENGINE_TARGETS.includes(value) ? value : 'auto';
}

export function detectVibeEngineTarget(request = '', target = 'auto') {
  const explicit = normalizeVibeEngineTarget(target);
  if (explicit !== 'auto') return explicit;
  if (hasAny(request, TARGET_WORDS.unreal)) return 'unreal';
  if (hasAny(request, TARGET_WORDS.unity)) return 'unity';
  if (hasAny(request, TARGET_WORDS.godot)) return 'godot';
  return 'web';
}

function sourceContract(target, slug) {
  const gameSlug = clean(slug) || '<slug>';
  if (target === 'unreal') {
    return freeze({
      root: `unreal-games/${gameSlug}`,
      writable: true,
      candidateFiles: freezeList([
        `unreal-games/${gameSlug}/*.uproject`,
        `unreal-games/${gameSlug}/Content/**`,
        `unreal-games/${gameSlug}/Config/**`,
        `unreal-games/${gameSlug}/Source/**`
      ]),
      ignoredPaths: freezeList([
        `unreal-games/${gameSlug}/Binaries/**`,
        `unreal-games/${gameSlug}/DerivedDataCache/**`,
        `unreal-games/${gameSlug}/Intermediate/**`,
        `unreal-games/${gameSlug}/Saved/**`
      ])
    });
  }
  if (target === 'unity') {
    return freeze({
      root: `unity-games/${gameSlug}`,
      writable: true,
      candidateFiles: freezeList([
        `unity-games/${gameSlug}/Assets/**`,
        `unity-games/${gameSlug}/Packages/manifest.json`,
        `unity-games/${gameSlug}/ProjectSettings/**`
      ]),
      ignoredPaths: freezeList([
        `unity-games/${gameSlug}/Library/**`,
        `unity-games/${gameSlug}/Temp/**`,
        `unity-games/${gameSlug}/Logs/**`,
        `unity-games/${gameSlug}/Build/**`,
        `unity-games/${gameSlug}/Builds/**`
      ])
    });
  }
  if (target === 'godot') {
    return freeze({
      root: `godot-games/${gameSlug}`,
      writable: true,
      candidateFiles: freezeList([
        `godot-games/${gameSlug}/project.godot`,
        `godot-games/${gameSlug}/**/*.gd`,
        `godot-games/${gameSlug}/**/*.tscn`,
        `godot-games/${gameSlug}/**/*.tres`
      ]),
      ignoredPaths: freezeList([`godot-games/${gameSlug}/.godot/**`])
    });
  }
  return freeze({
    root: `web-games/${gameSlug}`,
    writable: false,
    candidateFiles: freezeList([`web-games/${gameSlug}/**`]),
    ignoredPaths: freezeList([]),
    readOnlyReason: 'web-games-archive-read-only'
  });
}

function qaContract(target) {
  const common = ['responsible-source-changed', 'protected-state-preserved', 'regression-checked', 'actual-result-observed'];
  if (target === 'unreal') return freezeList([
    ...common,
    'uproject-resolves',
    'cpp-compile',
    'blueprint-reference-check',
    'map-level-load',
    'animation-blueprint-montage-state-machine-check',
    'ik-rig-retargeter-control-rig-check',
    'packaging-check',
    'target-platform-runtime-check',
    'shader-memory-frame-budget-check'
  ]);
  if (target === 'unity') return freezeList([
    ...common,
    'csharp-compile',
    'scene-prefab-reference-check',
    'animator-animationclip-check',
    'android-build-check',
    'runtime-check'
  ]);
  if (target === 'godot') return freezeList([
    ...common,
    'project-godot-load',
    'scene-script-reference-check',
    'runtime-check'
  ]);
  return freezeList([...common, 'browser-runtime-check', 'mobile-layout-check']);
}

function motionBindings(target) {
  if (target === 'unreal') return freezeList(['Animation Blueprint', 'Montage', 'Blend Space', 'State Machine', 'IK Rig', 'IK Retargeter', 'Control Rig']);
  if (target === 'unity') return freezeList(['Animator', 'AnimationClip', 'Avatar', 'Avatar Mask', 'Animation Rigging']);
  if (target === 'godot') return freezeList(['AnimationPlayer', 'AnimationTree', 'Skeleton3D']);
  return freezeList(['animation-state', 'sprite-or-render-state']);
}

export function createVibeEngineAdapter({ request = '', target = 'auto', gameSlug = '' } = {}) {
  const resolvedTarget = detectVibeEngineTarget(request, target);
  const source = sourceContract(resolvedTarget, gameSlug);
  return freeze({
    version: 1,
    target: resolvedTarget,
    source,
    qa: qaContract(resolvedTarget),
    motionBindings: motionBindings(resolvedTarget),
    gameplayAuthority: 'engine-resolves-authoritative-gameplay-results',
    commonModel: 'engine-neutral-game-model',
    webArchiveReadOnly: resolvedTarget === 'web',
    mayWriteSource: source.writable === true,
    requiresBuildEvidence: ['unity', 'unreal'].includes(resolvedTarget),
    requiresMotionRuntimeEvidence: ['unity', 'unreal', 'godot'].includes(resolvedTarget)
  });
}

export function validateVibeEngineAdapter(adapter) {
  const issues = [];
  if (!adapter || !VIBE_ENGINE_TARGETS.includes(adapter.target)) issues.push('unsupported-target');
  if (!adapter?.source?.root) issues.push('source-root-required');
  if (!Array.isArray(adapter?.source?.candidateFiles) || adapter.source.candidateFiles.length === 0) issues.push('candidate-files-required');
  if (adapter?.target === 'web' && adapter?.mayWriteSource !== false) issues.push('web-archive-must-be-read-only');
  if (adapter?.target === 'unreal' && !adapter.source.candidateFiles.some((path) => path.endsWith('*.uproject'))) issues.push('unreal-uproject-required');
  return freeze({ valid: issues.length === 0, issues: freezeList(issues) });
}

if (typeof window !== 'undefined') {
  window.JaewoonVibeEngineAdapter = freeze({
    detectVibeEngineTarget,
    createVibeEngineAdapter,
    validateVibeEngineAdapter
  });
}
