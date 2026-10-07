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

function sourceContract(target, slug, motionRepairWorkUnit=null, assetQualityWorkUnit=null) {
  if(assetQualityWorkUnit){
    const unit=assetQualityWorkUnit;
    const root=clean(unit.sourceRoot).replaceAll('\\','/').replace(/\/$/,'');
    const sourcePath=clean(unit.sourcePath).replaceAll('\\','/');
    const file=root+'/'+sourcePath;
    const ext=(sourcePath.match(/\.[^.\/]+$/)?.[0]||'').toLowerCase();
    const allowed=target==='roblox'?new Set(['.luau','.lua','.json']):target==='unity'?new Set(['.cs','.asmdef','.json','.uxml','.uss','.unity','.prefab','.asset']):target==='web'?new Set(['.html','.htm','.css','.js','.mjs','.cjs','.json','.svg']):new Set([]);
    // 잘못된 내부 자산 주문이 일반 게임 쓰기로 떨어지거나 다른 플랫폼에 전달되면 안 된다.
    // 해시는 형식만 검사한다. 실제 파일 일치와 native 검증은 기존 worker/QA가 확인한다.
    const platform=clean(unit.platform).toLowerCase();
    const nativeRoot=/^assets\/(roblox|unity|web)\//.exec(root)?.[1]||null;
    if(unit.scope!=='INTERNAL_ASSET_LIBRARY_QUALITY'||motionRepairWorkUnit
      ||!['roblox','unity','web'].includes(target)||platform!==target
      ||!clean(unit.assetId)||!/^[a-f0-9]{64}$/i.test(clean(unit.sourceHash))
      ||!/^assets\/[A-Za-z0-9._/-]+$/.test(root)
      ||root.split('/').some(part=>!part||part==='.'||part==='..')
      ||!sourcePath||!/^[A-Za-z0-9._/-]+$/.test(sourcePath)
      ||sourcePath.split('/').some(part=>!part||part==='.'||part==='..')
      ||(nativeRoot&&nativeRoot!==target)||!allowed.has(ext)
      ||clean(unit.sourceFile)!==file||Number(unit.estimatedModificationMinutes)!==60
      ||(unit.workerTimeoutMinutes!=null&&Number(unit.workerTimeoutMinutes)!==60)){
      throw new Error('INTERNAL_ASSET_QUALITY_SOURCE_SCOPE_INVALID');
    }
    return freeze({root,writable:true,internalAssetQuality:true,candidateFiles:freezeList([file]),textWritablePatterns:freezeList([file]),editorRequiredPatterns:freezeList([]),ignoredPaths:freezeList([]),maintenanceOnly:false,newGameAutomatic:true});
  }
  if(motionRepairWorkUnit?.scope==='INTERNAL_ASSET_LIBRARY'){
    const unit=motionRepairWorkUnit;
    const id=clean(unit.objectId).replace(/^roblox-world-ghost-/, '');
    if(target!=='roblox'||!/^roblox-world-ghost-[a-z0-9-]+$/.test(clean(unit.objectId))
      ||unit.objectCount!==1||unit.motionCount!==1||unit.clipId!=='walk'
      ||unit.sourcePath!=='init.luau')throw new Error('INTERNAL_MOTION_SOURCE_SCOPE_INVALID');
    const root='assets/roblox/world-ghosts/motions/'+id;
    const file=root+'/'+unit.sourcePath;
    return freeze({root,writable:true,internalAssetMotion:true,candidateFiles:freezeList([file]),
      textWritablePatterns:freezeList([file]),editorRequiredPatterns:freezeList([]),ignoredPaths:freezeList([])});
  }
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
    maintenanceOnly: false,
    newGameAutomatic: true
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
  return freeze({textWorkerAllowed:true, editorWorkerRequiredForBinaryAssets:false, editorRuntime:'browser-runtime', editorRequiredCapabilities:freezeList(['browser runtime','mobile layout','touch input']), binaryAssetsDirectTextEditForbidden:true, localEditorPreferred:false, textWritablePatterns:source.textWritablePatterns, editorRequiredPatterns:source.editorRequiredPatterns, maintenanceOnly:false, newGameAutomatic:true});
}

export function createVibeEngineAdapter({ request = '', target = 'auto', gameSlug = '', motionRepairWorkUnit = null, assetQualityWorkUnit = null } = {}) {
  const resolvedTarget = detectVibeEngineTarget(request, target);
  const source = sourceContract(resolvedTarget, gameSlug, motionRepairWorkUnit, assetQualityWorkUnit);
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
    webMaintenanceOnly:false,
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
  if (adapter?.target === 'web' && adapter?.source?.maintenanceOnly === true) issues.push('web-first-implementation-must-not-be-maintenance-only');
  if (adapter?.target === 'web' && adapter?.source?.newGameAutomatic !== true) issues.push('web-first-implementation-must-be-automatic-after-company-gate');
  if (adapter?.target === 'roblox' && adapter?.source?.root?.startsWith('roblox-games/') !== true && !(adapter.source.internalAssetMotion===true&& /^assets\/roblox\/world-ghosts\/motions\/[a-z0-9-]+$/.test(adapter.source.root)&&adapter.source.candidateFiles.length===1&&adapter.source.candidateFiles[0]===adapter.source.root+'/init.luau') && !(adapter.source.internalAssetQuality===true&&adapter.source.root.startsWith('assets/')&&adapter.source.candidateFiles.length===1&&adapter.source.candidateFiles[0].startsWith(adapter.source.root+'/'))) issues.push('roblox-source-root-required');
  if (adapter?.target === 'roblox' && adapter?.execution?.binaryAssetsDirectTextEditForbidden !== true) issues.push('roblox-place-assets-must-not-be-text-edited');
  if (adapter?.target === 'unreal' && !adapter.source.candidateFiles.some((value) => value.endsWith('*.uproject'))) issues.push('unreal-uproject-required');
  if (adapter?.target === 'unreal' && adapter?.execution?.binaryAssetsDirectTextEditForbidden !== true) issues.push('unreal-binary-assets-must-not-be-text-edited');
  return freeze({ valid:issues.length === 0, issues:freezeList(issues) });
}

if (typeof window !== 'undefined') {
  window.JaewoonVibeEngineAdapter = freeze({ detectVibeEngineTarget, createVibeEngineAdapter, validateVibeEngineAdapter });
}
