// 파일명: assets/vibe-build-plan.js
// 역할: 바이브 게임 개발 작업을 한 번에 분석해 웹/Godot/복구/에셋/애니메이션/그래픽 스타일/QA 계획으로 통합
// 규칙: 기존 코드 확인 우선, 기존 게임 자동 변경 금지, 안전한 최소 수정, 그래픽·애니메이션·모션 우선

import { createVibeWorkPlan } from './vibe-orchestrator.js';
import { planVibeWorkbenchTask } from './vibe-workbench.js';
import { planAssetApplication } from './asset-selector.js';
import { createVibeRebuildPlan } from './vibe-rebuild-planner.js';
import { createVisualStyleProfile } from './visual-style.js';

function clean(value) { return String(value ?? '').trim(); }
function unique(values) { return [...new Set(values.filter(Boolean))]; }

export function createVibeBuildPlan({ request = '', target = 'auto', gameId = null, file = null, knownBroken = false, assetManifest = null, rebuild = false, visualStyle = null } = {}) {
  const prompt = clean(request);
  if (!prompt) throw new Error('build plan request required');

  const work = createVibeWorkPlan({ request: prompt, target, gameId, file, knownBroken });
  const workbench = planVibeWorkbenchTask({ request: prompt, target, gameId, file, knownBroken });
  const assets = planAssetApplication({ prompt, manifest: assetManifest });
  const wantsRebuild = Boolean(rebuild) || /고퀄|퀄리티|업그레이드|고급화|리메이크|리빌드|제대로|그래픽|애니|모션/i.test(prompt);
  const rebuildPlan = wantsRebuild ? createVibeRebuildPlan({ request: prompt, target, gameType: 'existing', keepRules: true, preserveSave: true }) : null;
  const visual = createVisualStyleProfile({ request: prompt, ...(visualStyle ? { style: visualStyle } : {}) });

  const phases = unique([
    ...work.steps,
    ...(wantsRebuild ? rebuildPlan.phases : []),
    '현재 그래픽 스타일과 목표 스타일 확정',
    '필요 에셋 종류와 기존 저장소 에셋 확인',
    '에셋 스타일·크기·비율·라이선스 확인',
    '캐릭터/적/보스/배경/UI/VFX 스타일 일관성 검사',
    '애니메이션 상태와 실제 프레임/모션 자산 확인',
    '모션과 게임 판정 동기화 기준 확인',
    '변경 세트 작성 및 보호 대상 비교',
    '코드/씬/에셋 연결',
    '전용 테스트',
    ...workbench.steps.filter((step) => !work.steps.includes(step)),
    '최종 회귀 QA',
  ]);

  return Object.freeze({
    version: 3,
    request: prompt,
    target: workbench.target,
    gameId: gameId ? clean(gameId) : null,
    knownBroken: Boolean(knownBroken),
    intent: Object.freeze(work.intents),
    rebuild: rebuildPlan,
    visualStyle: visual,
    affectedSystems: Object.freeze(unique([...work.affectedSystems, ...workbench.affectedSystems, 'visual', 'animation'])),
    candidateFiles: Object.freeze(unique([...work.candidateFiles, ...workbench.candidateFiles])),
    protectedTargets: Object.freeze(unique([...work.protectedTargets, ...workbench.protectedTargets])),
    assets,
    animation: Object.freeze({ required: true, priority: 1, states: ['idle', 'move', 'attack', 'hit', 'skill', 'death'], motionSyncRequired: true, styleDriven: true }),
    visual: Object.freeze({ required: true, priority: 1, styleConsistent: true, replaceableWithoutGameplayRewrite: true, profileVersion: visual.version }),
    mobile: Object.freeze({ touchFirst: true, virtualJoystick: true, safeArea: true, responsiveOrientation: true, keyboardDefault: false }),
    phases: Object.freeze(phases),
    qa: Object.freeze(unique([...work.qa, '에셋 경로/라이선스', '그래픽 스타일 일관성', '애니메이션 프레임/상태 전환', '모션-판정 동기화', '세이브 호환성', '웹/Godot 참조 무결성'])),
    warnings: Object.freeze(unique([...work.warnings, ...workbench.warnings, ...(assets.missingTypes.length ? [`에셋 부족: ${assets.missingTypes.join(', ')}`] : [])])),
    policy: Object.freeze({ existingGameAutoApply: false, directSourceEditPreferred: true, saveMigrationRequiredForBreakingChange: true, reviewBeforeCommit: true }),
  });
}

export const planVibeBuild = createVibeBuildPlan;
if (typeof window !== 'undefined') window.createJaewoonVibeBuildPlan = createVibeBuildPlan;
