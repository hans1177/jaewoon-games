// 파일명: assets/vibe-engine-adapter.js
// 역할: Vibe2의 엔진별 책임 경로·검증·빌드·실행 능력을 하나의 계약으로 정규화한다.
// 원칙: 공통 의미 모델은 유지하고 실제 파일/에디터/빌드 차이만 어댑터가 담당한다.

const clean = (value) => String(value ?? '').trim();
const freeze = (value) => Object.freeze(value);
const freezeList = (value = []) => freeze([...new Set(value.map(clean).filter(Boolean))]);

export const VIBE_ENGINE_TARGETS = freeze(['roblox', 'web', 'godot', 'unity', 'unreal']);

const TARGET_WORDS = freeze({
  roblox: freeze(['roblox', '로블록스', 'luau', '.luau', '.rbxl', '.rbxlx', 'rojo']),
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
  if (hasAny(request, TARGET_WORDS.roblox)) return 'roblox';
  if (hasAny(request, TARGET_WORDS.unreal)) return 'unreal';
  if (hasAny(request, TARGET_WORDS.unity)) return 'unity';
  if (hasAny(request, TARGET_WORDS.godot)) return 'godot';
  return 'web';
}

function sourceContract(target, slug) {
  const gameSlug = clean(slug) || '<slug>';
  if (target === 'roblox') {
    return freeze({
      root: `roblox-games/${gameSlug}`,
      writable: true,
      candidateFiles: freezeList([
        `roblox-games/${gameSlug}/**/*.luau`,
        `roblox-games/${gameSlug}/**/*.lua`,
        `roblox-games/${gameSlug}/**/*.json`,
        `roblox-games/${gameSlug}/*.rbxlx`,
        `roblox-games/${gameSlug}/*.rbxl`
      ]),
      textWritablePatterns: freezeList([
        `roblox-games/${gameSlug}/**/*.luau`,
        `roblox-games/${gameSlug}/**/*.lua`,
        `roblox-games/${gameSlug}/**/*.json`
      ]),
      editorRequiredPatterns: freezeList([
        `roblox-games/${gameSlug}/**/*.rbxlx`,
        `roblox-games/${gameSlug}/**/*.rbxl`
      ]),
      ignoredPaths: freezeList([
        `roblox-games/${gameSlug}/build/**`,
        `roblox-games/${gameSlug}/dist/**`,
        `roblox-games/${gameSlug}/.rbxcloud/**`
      ])
    });
  }
  if (target === 'unreal') {
    return freeze({
      root: `unreal-games/${gameSlug}`,
      writable: true,
      candidateFiles: freezeList([`unreal-games/${gameSlug}/*.uproject`, `unreal-games/${gameSlug}/Content/**`, `unreal-games/${gameSlug}/Config/**`, `unreal-games/${gameSlug}/Source/**`]),
      textWritablePatterns: freezeList([`unreal-games/${gameSlug}/*.uproject`, `unreal-games/${gameSlug}/Config/**/*.ini`, `unreal-games/${gameSlug}/Source/**/*.h`, `unreal-games/${gameSlug}/Source/**/*.hpp`, `unreal-games/${gameSlug}/Source/**/*.cpp`, `unreal-games/${gameSlug}/Source/**/*.cs`]),
      editorRequiredPatterns: freezeList([`unreal-games/${gameSlug}/Content/**/*.uasset`, `unreal-games/${gameSlug}/Content/**/*.umap`]),
      ignoredPaths: freezeList([`unreal-games/${gameSlug}/Binaries/**`, `unreal-games/${gameSlug}/DerivedDataCache/**`, `unreal-games/${gameSlug}/Intermediate/**`, `unreal-games/${gameSlug}/Saved/**`])
    });
  }
  if (target === 'unity') {
    return freeze({
      root: `unity-games/${gameSlug}`,
      writable: true,
      candidateFiles: freezeList([`unity-games/${gameSlug}/Assets/**`, `unity-games/${gameSlug}/Packages/manifest.json`, `unity-games/${gameSlug}/ProjectSettings/**`]),
      textWritablePatterns: freezeList([`unity-games/${gameSlug}/Assets/**/*.cs`, `unity-games/${gameSlug}/Assets/**/*.asmdef`, `unity-games/${gameSlug}/Assets/**/*.json`, `unity-games/${gameSlug}/Assets/**/*.uxml`, `unity-games/${gameSlug}/Assets/**/*.uss`, `unity-games/${gameSlug}/Assets/**/*.unity`, `unity-games/${gameSlug}/Assets/**/*.prefab`, `unity-games/${gameSlug}/Packages/manifest.json`, `unity-games/${gameSlug}/ProjectSettings/**/*.asset`]),
      editorRequiredPatterns: freezeList([`unity-games/${gameSlug}/Assets/**/*.controller`, `unity-games/${gameSlug}/Assets/**/*.anim`, `unity-games/${gameSlug}/Assets/**/*.avatar`]),
      ignoredPaths: freezeList([`unity-games/${gameSlug}/Library/**`, `unity-games/${gameSlug}/Temp/**`, `unity-games/${gameSlug}/Logs/**`, `unity-games/${gameSlug}/Build/**`, `unity-games/${gameSlug}/Builds/**`])
    });
  }
  if (target === 'godot') {
    return freeze({
      root: `godot-games/${gameSlug}`,
      writable: true,
      candidateFiles: freezeList([`godot-games/${gameSlug}/project.godot`, `godot-games/${gameSlug}/**/*.gd`, `godot-games/${gameSlug}/**/*.tscn`, `godot-games/${gameSlug}/**/*.tres`]),
      textWritablePatterns: freezeList([`godot-games/${gameSlug}/project.godot`, `godot-games/${gameSlug}/**/*.gd`, `godot-games/${gameSlug}/**/*.tscn`, `godot-games/${gameSlug}/**/*.tres`]),
      editorRequiredPatterns: freezeList([]),
      ignoredPaths: freezeList([`godot-games/${gameSlug}/.godot/**`])
    });
  }
  return freeze({
    root: `web-games/${gameSlug}`,
    writable: true,
    candidateFiles: freezeList([`web-games/${gameSlug}/**/*.html`, `web-games/${gameSlug}/**/*.css`, `web-games/${gameSlug}/**/*.js`, `web-games/${gameSlug}/**/*.mjs`, `web-games/${gameSlug}/**/*.json`, `web-games/${gameSlug}/**/*.svg`]),
    textWritablePatterns: freezeList([`web-games/${gameSlug}/**/*.html`, `web-games/${gameSlug}/**/*.css`, `web-games/${gameSlug}/**/*.js`, `web-games/${gameSlug}/**/*.mjs`, `web-games/${gameSlug}/**/*.json`, `web-games/${gameSlug}/**/*.svg`]),
    editorRequiredPatterns: freezeList([]),
    ignoredPaths: freezeList([`web-games/${gameSlug}/node_modules/**`, `web-games/${gameSlug}/dist/**`]),
    maintenanceOnly: true,
    newGameAutomatic: false
  });
}

function qaContract(target) {
  const common = ['responsible-source-changed', 'protected-state-preserved', 'regression-checked', 'actual-result-observed'];
  if (target === 'roblox') return freezeList([...common, 'luau-source-check', 'rojo-project-check-when-applicable', 'place-package-check', 'target-platform-runtime-check', 'independent-qa-check', 'regression-check', 'exact-revision-check']);
  if (target === 'unreal') return freezeList([...common, 'uproject-resolves', 'cpp-compile', 'blueprint-reference-check', 'map-level-load', 'animation-blueprint-montage-state-machine-check', 'ik-rig-retargeter-control-rig-check', 'packaging-check', 'target-platform-runtime-check', 'shader-memory-frame-budget-check']);
  if (target === 'unity') return freezeList([...common, 'csharp-compile', 'scene-prefab-reference-check', 'animator-animationclip-check', 'android-build-check', 'runtime-check']);
  if (target === 'godot') return freezeList([...common, 'project-godot-load', 'scene-script-reference-check', 'runtime-check']);
  return freezeList([...common, 'browser-runtime-check', 'mobile-layout-check', 'touch-input-check', 'save-regression-check']);
}

function motionBindings(target) {
  if (target === 'roblox') return freezeList(['Animator', 'AnimationTrack', 'Humanoid', 'Motor6D']);
  if (target === 'unreal') return freezeList(['Animation Blueprint', 'Montage', 'Blend Space', 'State Machine', 'IK Rig', 'IK Retargeter', 'Control Rig']);
  if (target === 'unity') return freezeList(['Animator', 'AnimationClip', 'Avatar', 'Avatar Mask', 'Animation Rigging']);
  if (target === 'godot') return freezeList(['AnimationPlayer', 'AnimationTree', 'Skeleton3D']);
  return freezeList(['animation-state', 'sprite-or-render-state']);
}

function executionContract(target, source) {
  if (target === 'roblox') return freeze({
    textWorkerAllowed:true,
    editorWorkerRequiredForBinaryAssets:true,
    editorRuntime:'roblox-studio-or-cloud-runtime',
    editorRequiredCapabilities:freezeList(['place package generation', 'target runtime verification']),
    binaryAssetsDirectTextEditForbidden:true,
    localEditorPreferred:false,
    textWritablePatterns:source.textWritablePatterns,
    editorRequiredPatterns:source.editorRequiredPatterns
  });
  if (target === 'unreal') return freeze({textWorkerAllowed:true, editorWorkerRequiredForBinaryAssets:true, editorRuntime:'unreal-editor-or-commandlet', editorRequiredCapabilities:freezeList(['Blueprint','Animation Blueprint','Montage','Blend Space','IK Rig','IK Retargeter','Control Rig','Level/Map binary asset']), binaryAssetsDirectTextEditForbidden:true, localEditorPreferred:true, textWritablePatterns:source.textWritablePatterns, editorRequiredPatterns:source.editorRequiredPatterns});
  if (target === 'unity') return freeze({textWorkerAllowed:true, editorWorkerRequiredForBinaryAssets:false, editorRuntime:'unity-editor-for-runtime-and-build-verification', editorRequiredCapabilities:freezeList(['Animator graph authoring when serialization is unsafe','runtime scene verification','Android build']), binaryAssetsDirectTextEditForbidden:true, localEditorPreferred:true, textWritablePatterns:source.textWritablePatterns, editorRequiredPatterns:source.editorRequiredPatterns});
  if (target === 'godot') return freeze({textWorkerAllowed:true, editorWorkerRequiredForBinaryAssets:false, editorRuntime:'godot-editor-or-headless-runtime', editorRequiredCapabilities:freezeList(['runtime verification']), binaryAssetsDirectTextEditForbidden:true, localEditorPreferred:false, textWritablePatterns:source.textWritablePatterns, editorRequiredPatterns:source.editorRequiredPatterns});
  return freeze({textWorkerAllowed:true, editorWorkerRequiredForBinaryAssets:false, editorRuntime:'browser-runtime', editorRequiredCapabilities:freezeList(['browser runtime','mobile layout','touch input']), binaryAssetsDirectTextEditForbidden:true, localEditorPreferred:false, textWritablePatterns:source.textWritablePatterns, editorRequiredPatterns:source.editorRequiredPatterns, maintenanceOnly:true, newGameAutomatic:false});
}

export function createVibeEngineAdapter({ request = '', target = 'auto', gameSlug = '' } = {}) {
  const resolvedTarget = detectVibeEngineTarget(request, target);
  const source = sourceContract(resolvedTarget, gameSlug);
  return freeze({
    version:3,
    target:resolvedTarget,
    source,
    execution:executionContract(resolvedTarget, source),
    qa:qaContract(resolvedTarget),
    motionBindings:motionBindings(resolvedTarget),
    gameplayAuthority:'engine-resolves-authoritative-gameplay-results',
    commonModel:'engine-neutral-game-model',
    webArchiveReadOnly:false,
    webMaintenanceOnly:resolvedTarget === 'web',
    mayWriteSource:source.writable === true,
    requiresBuildEvidence:['roblox','unity','unreal'].includes(resolvedTarget),
    requiresMotionRuntimeEvidence:['roblox','unity','unreal','godot'].includes(resolvedTarget)
  });
}

export function validateVibeEngineAdapter(adapter) {
  const issues = [];
  if (!adapter || !VIBE_ENGINE_TARGETS.includes(adapter.target)) issues.push('unsupported-target');
  if (!adapter?.source?.root) issues.push('source-root-required');
  if (!Array.isArray(adapter?.source?.candidateFiles) || adapter.source.candidateFiles.length === 0) issues.push('candidate-files-required');
  if (!Array.isArray(adapter?.source?.textWritablePatterns)) issues.push('text-writable-patterns-required');
  if (!Array.isArray(adapter?.source?.editorRequiredPatterns)) issues.push('editor-required-patterns-required');
  if (adapter?.target === 'web' && adapter?.mayWriteSource !== true) issues.push('existing-web-maintenance-must-be-writable');
  if (adapter?.target === 'web' && adapter?.source?.maintenanceOnly !== true) issues.push('web-maintenance-only-required');
  if (adapter?.target === 'roblox' && adapter?.source?.root?.startsWith('roblox-games/') !== true) issues.push('roblox-source-root-required');
  if (adapter?.target === 'roblox' && adapter?.execution?.binaryAssetsDirectTextEditForbidden !== true) issues.push('roblox-place-assets-must-not-be-text-edited');
  if (adapter?.target === 'unreal' && !adapter.source.candidateFiles.some((value) => value.endsWith('*.uproject'))) issues.push('unreal-uproject-required');
  if (adapter?.target === 'unreal' && adapter?.execution?.binaryAssetsDirectTextEditForbidden !== true) issues.push('unreal-binary-assets-must-not-be-text-edited');
  return freeze({ valid:issues.length === 0, issues:freezeList(issues) });
}

if (typeof window !== 'undefined') {
  window.JaewoonVibeEngineAdapter = freeze({ detectVibeEngineTarget, createVibeEngineAdapter, validateVibeEngineAdapter });
}
