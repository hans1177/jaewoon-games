// 파일명: assets/vibe-build-plan.js
// 역할: 바이브 게임 개발 작업을 한 번에 분석해 웹/Godot/복구/에셋/애니메이션/QA 계획으로 통합
// 규칙: 기존 코드 확인 우선, 기존 게임 자동 변경 금지, 안전한 최소 수정, 모바일 기본

import { createVibeWorkPlan } from './vibe-orchestrator.js';
import { planVibeWorkbenchTask } from './vibe-workbench.js';
import { planAssetApplication } from './asset-selector.js';

function clean(value) { return String(value ?? '').trim(); }
function unique(values) { return [...new Set(values.filter(Boolean))]; }

export function createVibeBuildPlan({ request = '', target = 'auto', gameId = null, file = null, knownBroken = false, assetManifest = null } = {}) {
  const prompt = clean(request);
  if (!prompt) throw new Error('build plan request required');

  const work = createVibeWorkPlan({ request: prompt, target, gameId, file, knownBroken });
  const workbench = planVibeWorkbenchTask({ request: prompt, target, gameId, file, knownBroken });
  const assets = planAssetApplication({ prompt, manifest: assetManifest });
  const wantsAnimation = /애니|애니메이션|움직임|걷기|달리기|공격 모션|피격|사망 모션/i.test(prompt);

  const phases = unique([
    ...work.steps,
    '필요 에셋 종류와 기존 저장소 에셋 확인',
    wantsAnimation ? '애니메이션 상태/프레임/전환 확인' : '기존 애니메이션 자산 존재 여부 확인',
    '변경 세트 작성 및 보호 대상 비교',
    '코드 수정',
    '전용 테스트',
    ...workbench.steps.filter((step) => !work.steps.includes(step)),
    '최종 회귀 QA',
  ]);

  return Object.freeze({
    version: 1,
    request: prompt,
    target: workbench.target,
    gameId: gameId ? clean(gameId) : null,
    knownBroken: Boolean(knownBroken),
    intent: Object.freeze(work.intents),
    affectedSystems: Object.freeze(unique([...work.affectedSystems, ...workbench.affectedSystems])),
    candidateFiles: Object.freeze(unique([...work.candidateFiles, ...workbench.candidateFiles])),
    protectedTargets: Object.freeze(unique([...work.protectedTargets, ...workbench.protectedTargets])),
    assets,
    animation: Object.freeze({ required: wantsAnimation || true, states: ['idle', 'move', 'attack', 'hit', 'death'] }),
    mobile: Object.freeze({ touchFirst: true, virtualJoystick: true, safeArea: true, responsiveOrientation: true, keyboardDefault: false }),
    phases: Object.freeze(phases),
    qa: Object.freeze(unique([...work.qa, '에셋 경로/라이선스', '애니메이션 상태 전환', '세이브 호환성', '웹/Godot 참조 무결성'])),
    warnings: Object.freeze(unique([...work.warnings, ...workbench.warnings, ...(assets.missingTypes.length ? [`에셋 부족: ${assets.missingTypes.join(', ')}`] : [])])),
    policy: Object.freeze({ existingGameAutoApply: false, directSourceEditPreferred: true, saveMigrationRequiredForBreakingChange: true, reviewBeforeCommit: true }),
  });
}

export const planVibeBuild = createVibeBuildPlan;
if (typeof window !== 'undefined') window.createJaewoonVibeBuildPlan = createVibeBuildPlan;
