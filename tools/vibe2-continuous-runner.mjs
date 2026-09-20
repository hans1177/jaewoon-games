// 파일명: tools/vibe2-continuous-runner.mjs
// 역할: Vibe2 병렬 큐에서 예약된 작업별 안전 작업주문을 생성한다.
// 원칙: 사용자 지시 > 출시확정 > 개발확정, DAG/source lock 예약 후 격리 후보 브랜치만 수정, 검증 전 main 반영 금지.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { planVibeCoreTask } from '../assets/vibe-core-runtime.js';
import { createVibeContinuousQueue, selectVibeQueueBatch } from '../assets/vibe-continuous-queue.js';
import { createVibeExperienceMemory } from '../assets/vibe-experience-memory.js';
import { generateVibe2Handoff } from './vibe2-handoff.mjs';
import { buildVibeDesignIntelligence } from './vibe2-design-intelligence.mjs';
import { retrieveUnifiedLearning, learningGuidance as buildMotorGuidance, candidateTournamentPolicy, preferredCodingStrategyForTask, codingStrategyGuidance, responsibilityCalibrationForTask, regressionHotspotRiskForTask, codingRiskGuidance, architectureDriftRiskForTask, architectureDriftGuidance, codingConstitutionRuleForTask, codingConstitutionGuidance } from './vibe2-learning-motor.mjs';
import { buildVibeAssetProductionPlan, assetProductionGuidance } from './vibe2-asset-production-plan.mjs';
import { loadCentralPolicySnapshot, compileVibeCentralWorkContract, compiledWorkContractGuidance } from './vibe2-central-work-contract.mjs';
import { buildNeuralDiagnosis, neuralDiagnosisGuidance } from './vibe2-neural-diagnosis.mjs';
import { retrieveVerifiedCapabilities, verifiedCapabilityGuidance } from './vibe2-capability-distillation.mjs';

const clean = (value) => String(value ?? '').trim();
const posix = (value) => clean(value).replaceAll('\\', '/');
const freeze = (value) => Object.freeze(value);
const freezeList = (values = []) => freeze([...new Set((values || []).map(clean).filter(Boolean))]);
const EDITOR_BINARY_EXTENSIONS = new Set(['.rbxl', '.rbxlx', '.uasset', '.umap', '.controller', '.anim', '.avatar']);
const AUTO_DEPLOY_STATES = new Set(['release-confirmed', 'development-confirmed']);
const PRESENTATION_PASSES = new Set(['ASSET_ADAPTATION','LIVING_MOTION','ANIMATION_FEEL','VFX','AUDIO_FEEL','CAMERA_LANGUAGE','POLISH_MOBILE']);

function readJson(file, fallback = {}) { if (!file || !fs.existsSync(file)) return fallback; return JSON.parse(fs.readFileSync(file, 'utf8')); }
function writeJson(file, value) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`); }
function parseArgs(argv = process.argv.slice(2)) {
  const args = {};
  for (const raw of argv) {
    if (!raw.startsWith('--')) continue;
    const body = raw.slice(2);
    const at = body.indexOf('=');
    if (at < 0) args[body] = true;
    else args[body.slice(0, at)] = body.slice(at + 1);
  }
  return args;
}
function writableTargetAllowed(runtime, target) {
  const allowed = Array.isArray(runtime?.safety?.allowedWritableTargets) ? runtime.safety.allowedWritableTargets.map((value) => clean(value).toLowerCase()) : ['roblox', 'web', 'unity', 'unreal', 'godot'];
  const resolved = clean(target).toLowerCase();
  if (resolved === 'web' && runtime?.safety?.existingWebMaintenanceAllowed !== true) return false;
  return allowed.includes(resolved);
}
function taskRequiresWrite(task) { return !['inspect', 'research', 'qa'].includes(clean(task?.type).toLowerCase()); }
function normalizeResponsibleFile(task) {
  const files = Array.isArray(task?.responsibleFiles) ? task.responsibleFiles.map(posix).filter(Boolean) : [];
  return files[0] || null;
}
function requestMentionsEditorOnlyCapability(target, request) {
  const text = clean(request).toLowerCase();
  if (target === 'roblox') return ['studio place','place package','.rbxl','.rbxlx','terrain editor','ro블록스 스튜디오','로블록스 스튜디오'].some((word) => text.includes(word));
  if (target === 'unreal') return ['blueprint','블루프린트','animation blueprint','anim blueprint','애님 블루프린트','montage','몽타주','blend space','블렌드 스페이스','control rig','컨트롤 릭','ik retargeter','리타게터','ik rig'].some((word) => text.includes(word));
  if (target === 'unity') return ['animator controller','애니메이터 컨트롤러','animationclip asset','animation clip asset','애니메이션 클립 에셋','avatar asset'].some((word) => text.includes(word));
  return false;
}
function responsibleFilesRequireEditor(task) { return (task?.responsibleFiles || []).some((file) => EDITOR_BINARY_EXTENSIONS.has(path.extname(posix(file)).toLowerCase())); }
function buildLearningGuidance(learning = {}) {
  const records = Array.isArray(learning?.records) ? learning.records.slice(0, 5) : [];
  if (!records.length) return '';
  const lines = ['[VERIFIED EXPERIENCE MEMORY - advisory only]','다음 기록은 검증된 과거 경험이다. 관련될 때만 패치 전략/회피 패턴으로 참고하고 승인 권한, 보호 규칙, 게임 수치를 자동 변경하지 않는다.'];
  for (const record of records) {
    const parts = [
      `경험 ${clean(record.id)}`, `결과=${clean(record.outcome)}`,
      clean(record.problem) ? `문제=${clean(record.problem).slice(0, 240)}` : '',
      clean(record.change) ? `검증변경=${clean(record.change).slice(0, 240)}` : '',
      clean(record.failureCause) ? `검증실패원인=${clean(record.failureCause).slice(0, 240)}` : '',
      (record.reusablePatterns || []).length ? `재사용=${record.reusablePatterns.join(' | ').slice(0, 300)}` : '',
      (record.avoidPatterns || []).length ? `회피=${record.avoidPatterns.join(' | ').slice(0, 300)}` : ''
    ].filter(Boolean);
    lines.push(`- ${parts.join('; ')}`);
  }
  return lines.join('\n');
}
function reusableContextsForTask(handoff = {}, task = {}) {
  const contexts = Array.isArray(handoff?.workState?.reusableContexts) ? handoff.workState.reusableContexts : [];
  const packageId = clean(task.packageId);
  return contexts.filter((row) => clean(row.taskId) === clean(task.id) || (packageId && clean(row.packageId) === packageId)).slice(-8);
}
function buildReusableHandoffGuidance(contexts = []) {
  if (!contexts.length) return '';
  const lines = ['[REUSABLE MACHINE HANDOFF - do not rediscover already known facts]'];
  for (const row of contexts) {
    const parts = [
      `task=${clean(row.taskId)}`,
      clean(row.packageId) ? `package=${clean(row.packageId)}` : '',
      (row.responsibleFiles || []).length ? `files=${row.responsibleFiles.join(',')}` : '',
      (row.reusableEvidence || []).length ? `evidence=${row.reusableEvidence.join(' | ')}` : '',
      clean(row.blocker) ? `lastBlocker=${clean(row.blocker)}` : '',
      clean(row.lastOutcome) ? `lastOutcome=${clean(row.lastOutcome)}` : ''
    ].filter(Boolean);
    lines.push(`- ${parts.join('; ')}`);
  }
  return lines.join('\n');
}
export function classifyVibeExecutionRoute({ target = '', task = {}, adapter = {} } = {}) {
  const normalizedTarget = clean(target).toLowerCase();
  if (!taskRequiresWrite(task)) return freeze({ route: 'analysis-only', requiresEditor: false, reason: 'non-write-task' });
  const binary = responsibleFilesRequireEditor(task);
  const requested = requestMentionsEditorOnlyCapability(normalizedTarget, task.goal);
  if (binary || requested) return freeze({ route:'engine-editor', requiresEditor:true, reason:binary?'responsible-binary-asset':'editor-only-capability-requested', editorRuntime:adapter?.execution?.editorRuntime || null, directBinaryTextEditForbidden:true });
  return freeze({ route:'text-source-worker', requiresEditor:false, reason:'text-source-capability' });
}
function resolveTask(queue, taskId = '') {
  const id = clean(taskId);
  if (id) {
    const task = queue.tasks.find((row) => row.id === id);
    if (!task) return { task:null, reason:'TASK_NOT_FOUND' };
    if (!['queued','running'].includes(task.status)) return { task:null, reason:`TASK_NOT_RUNNABLE:${task.status}` };
    if (task.status === 'queued') {
      const selection = selectVibeQueueBatch(queue);
      if (!selection.selected.some((row) => row.id === id)) return { task:null, reason:`TASK_NOT_RESERVED_OR_ELIGIBLE:${selection.stopReason || 'conflict'}` };
    }
    return { task, reason:null };
  }
  const selection = selectVibeQueueBatch(queue);
  return { task:selection.selected[0] || null, reason:selection.stopReason || 'NO_ELIGIBLE_WORK' };
}
function presentationPassFromTask(task = {}) {
  const evidence=(task?.evidence||[]).map(clean);
  const marker=evidence.find(value=>value.startsWith('presentation-pass:'));
  const fromEvidence=marker?marker.slice('presentation-pass:'.length).toUpperCase():'';
  if(PRESENTATION_PASSES.has(fromEvidence))return fromEvidence;
  const match=/\[PRESENTATION_PASS:([A-Z_]+)\]/i.exec(clean(task?.goal));
  const fromGoal=clean(match?.[1]).toUpperCase();
  return PRESENTATION_PASSES.has(fromGoal)?fromGoal:null;
}
function presentationTaskType(task = {}) {
  const pass=presentationPassFromTask(task);
  if(pass==='ASSET_ADAPTATION')return'graphics';
  if(pass==='VFX')return'vfx';
  if(pass==='AUDIO_FEEL')return'audio';
  if(pass)return'presentation';
  return clean(task?.type)||'coding';
}
function buildPresentationQualityContract(task = {}, target = '') {
  const pass=presentationPassFromTask(task);
  if(!pass)return freeze({required:false,pass:null,authorityExpanded:false});
  const checks={
    ASSET_ADAPTATION:['style-lock-consistency','reuse-existing-assets-first','no-duplicate-render-pipeline','gameplay-semantics-unchanged'],
    LIVING_MOTION:['idle-alive-motion','locomotion-blend-or-equivalent','acceleration-deceleration','turn-smoothing','secondary-motion','gameplay-speed-unchanged'],
    ANIMATION_FEEL:['anticipation','impact-sync','hit-stop-presentation-only','recoil-recovery','authoritative-hit-event-preserved'],
    VFX:['impact-feedback','effect-budget','mobile-readability','bounded-particles-or-transients','gameplay-readability-preserved'],
    AUDIO_FEEL:['first-gesture-audio-web','mute-volume','no-duplicate-resume-playback','state-transition-audio','impact-audio-sync'],
    CAMERA_LANGUAGE:['subtle-normal-response','strong-action-response','hero-moment-control','mobile-readability','no-critical-input-obscure'],
    POLISH_MOBILE:['animation-pop-removal','vfx-clutter-check','audio-transition-check','touch-during-effects','frame-stability','save-gameplay-semantics-unchanged']
  };
  const runtimeChecks={
    ASSET_ADAPTATION:['same-scene-before-after-readability'],
    LIVING_MOTION:['idle-walk-run-or-equivalent-runtime-continuity','turn-runtime-continuity'],
    ANIMATION_FEEL:['impact-event-runtime-sync','input-not-blocked-by-hit-stop'],
    VFX:['combat-clutter-runtime-check','mobile-touch-under-effects'],
    AUDIO_FEEL:['audio-unlock-runtime','music-transition-runtime','background-resume-runtime'],
    CAMERA_LANGUAGE:['camera-motion-runtime-readability','touch-aim-or-control-runtime'],
    POLISH_MOBILE:['mobile-frame-stability','long-session-presentation-stability']
  };
  return freeze({
    required:true,
    version:1,
    pass,
    policyRefs:freezeList(['company-learning/platform-release-roadmap.json#livingMotionVisualQualityContract','company-learning/platform-release-roadmap.json#audioMusicQualityContract']),
    preserve:freezeList(['GAMEPLAY_BALANCE','SAVE_MEANING','PROGRESSION','HIT_SEMANTICS','NETWORK_AUTHORITY']),
    staticChecks:freezeList(checks[pass]||[]),
    runtimeChecks:freezeList(runtimeChecks[pass]||[]),
    target:clean(target).toLowerCase()||null,
    wrapperOrShadowPipelineForbidden:true,
    directResponsibleSystemModificationPreferred:true,
    authorityExpanded:false
  });
}
function presentationQualityGuidance(contract = {}) {
  if(contract?.required!==true)return'';
  return [
    '[VIBE PRESENTATION QUALITY CONTRACT]',
    `pass=${contract.pass}`,
    `preserve=${(contract.preserve||[]).join(',')}`,
    `static-checks=${(contract.staticChecks||[]).join(',')}`,
    `runtime-checks=${(contract.runtimeChecks||[]).join(',')}`,
    '기존 책임 시스템을 직접 수정하고 wrapper/shadow 표현 파이프라인을 만들지 않는다.',
    '표현 품질 수정은 게임 밸런스·저장·진행·판정·네트워크 권한을 바꾸지 않는다.',
    '정적 QA 통과만으로 완료가 아니며 실제 runtime/mobile 검증이 최종 근거다.'
  ].join('\n');
}

function incrementalQaPlan(task, target, responsibleFiles, speculativeVariants = 1) {
  const files = freezeList(responsibleFiles || []);
  return freeze({
    mode:'impact-first-content-hash',
    changedScope:files,
    cacheNamespace:`${clean(target)}:${clean(task.gameId) || 'global'}`,
    deterministicChecks:freezeList(['git-diff-check','conflict-marker-scan','text-sanity','js-syntax-when-applicable','json-parse-when-applicable']),
    fullRegressionAtFanIn:true,
    contentHashCache:true,
    speculativeVariants:Math.max(1,Math.min(5,Number(speculativeVariants)||1))
  });
}

function candidateStrategyRole(variant='primary',preference={}){
  const normalized=clean(variant)||'primary';
  if(normalized==='speculative-1')return freeze({variant:normalized,strategy:'DEPENDENCY_SAFE_COHERENT_PATCH',directive:'Patch the primary responsibility plus only the directly required dependent symbols. Prefer a coherent dependency-safe change over an ultra-local patch that leaves the behavior chain broken.'});
  if(normalized==='speculative-2')return freeze({variant:normalized,strategy:clean(preference?.strategy)||'CAUSAL_TRACE_CROSSCHECK',directive:'Cross-check the full causal chain from input or failure evidence to owned state and observable result. Reuse a verified preferred strategy only when it fits this exact edit contract.'});
  if(/^speculative-/.test(normalized))return freeze({variant:normalized,strategy:'INVARIANT_PRESERVING_ALTERNATIVE',directive:'Produce a genuinely different invariant-preserving implementation approach inside the exact same writable scope. Do not widen files or bypass the compiled edit contract.'});
  return freeze({variant:normalized,strategy:'PRIMARY_RESPONSIBILITY_MINIMAL',directive:'Start at the compiled primary responsibility and make the minimum coherent change that produces the required observable result.'});
}

export function buildVibeContinuousWorkOrder({ runtime = {}, queue = {}, experience = {}, handoff = null, taskId = '', variant = 'primary', learningMotorState = {}, codePatterns = {}, playbooks = {}, practiceDistilled = {}, centralPolicySnapshot = null, centralPolicyLiveRef = '' } = {}) {
  const normalizedQueue = createVibeContinuousQueue(queue);
  const resolved = resolveTask(normalizedQueue, taskId);
  const base = {
    version:6, generatedAt:new Date().toISOString(), run:false, reason:null, mode:'vibe2-parallel-work-order',
    machineHandoff:freeze({ used:Boolean(handoff?.kind), kind:handoff?.kind || null, sourceOfTruth:handoff?.sourceOfTruth || null, consistency:handoff?.consistency || {ok:true,errors:[]}, currentPersistentMax:Number(handoff?.parallelism?.currentPersistentMax || runtime?.continuous?.maxConcurrentGameTasks || 20), lastDecision:handoff?.parallelism?.lastDecision || null, ownerDirectiveOpenCount:Number(handoff?.workState?.ownerDirectiveOpenCount || 0), reusableContextCount:Number(handoff?.workState?.reusableContexts?.length || 0) }),
    scheduler:freeze({ hierarchicalParallelism:true, dag:true, shardAware:true, workStealing:true, sourceRootLock:true, eventDriven:true, dynamicBackpressure:true, longWorkProtectedSlot:true, roleSeparated:true }),
    safety:freeze({
      directMainWrite:false,
      existingWebMaintenanceAllowed:runtime?.safety?.existingWebMaintenanceAllowed === true,
      newWebGameAutomatic:runtime?.safety?.newWebGameAutomatic === true,
      paidAIAllowed:runtime?.safety?.paidAIAllowed === true,
      paidRunnerAllowed:runtime?.safety?.paidRunnerAllowed === true,
      binaryAssetsDirectTextEditForbidden:true,
      sameFileParallelWrite:false
    })
  };
  if (handoff?.kind && handoff.consistency?.ok !== true) return freeze({ ...base, reason:`MACHINE_STATE_INCONSISTENT:${(handoff.consistency?.errors || []).join('|') || 'UNKNOWN'}` });
  if (runtime?.continuous?.enabled === false) return freeze({ ...base, reason:'CONTINUOUS_DISABLED' });
  if (!resolved.task) return freeze({ ...base, reason:resolved.reason || 'NO_ELIGIBLE_WORK' });
  const task = resolved.task;
  const centralPolicy = centralPolicySnapshot || loadCentralPolicySnapshot({ repoRoot:process.cwd(), required:true });
  if (centralPolicy.required === true && centralPolicy.valid !== true) return freeze({ ...base, reason:`CENTRAL_POLICY_INVALID:${(centralPolicy.errors || []).join('|') || 'UNKNOWN'}`, selectedTask:task, centralPolicy });
  const neuralDiagnosis = task?.neuralDiagnosis || buildNeuralDiagnosis({task});
  const neuralGuidance = neuralDiagnosisGuidance(neuralDiagnosis);
  const requiresWrite = taskRequiresWrite(task);
  if (requiresWrite && !writableTargetAllowed(runtime, task.target)) return freeze({ ...base, reason:`WRITABLE_TARGET_FORBIDDEN:${task.target}`, selectedTask:task });

  const plan = planVibeCoreTask({
    request:task.goal, target:task.target, gameId:task.gameId, file:normalizeResponsibleFile(task),
    experienceMemory:createVibeExperienceMemory(experience), departments:task.department?[task.department]:[], ownerDirective:task.ownerDirective
  });
  const gateReasons = [...(plan.executionGate?.reasons || [])];
  const analysisOnlyRead = !requiresWrite && gateReasons.length === 1 && gateReasons[0] === 'source-read-only';
  const mayRun = plan.executionGate?.mayExecute === true || analysisOnlyRead;
  if (!mayRun) return freeze({ ...base, reason:`EXECUTION_GATE_BLOCKED:${gateReasons.join(',') || 'unknown'}`, selectedTask:task, gate:plan.executionGate });

  const designIntelligence = buildVibeDesignIntelligence({ task, plan, experience });
  if (requiresWrite && designIntelligence.implementationGate.allowed !== true) {
    return freeze({
      ...base,
      reason:`DESIGN_INTELLIGENCE_BLOCKED:${designIntelligence.implementationGate.blockers.join(',') || 'unknown'}`,
      selectedTask:task,
      gate:plan.executionGate,
      designIntelligence
    });
  }

  const adapter = plan.engineAdapter;
  const route = classifyVibeExecutionRoute({ target:plan.target, task, adapter });
  const maxWorkMinutes = Math.max(1, Math.min(60, Math.floor(Number(runtime?.continuous?.maxWorkMinutes) || 20)));
  const editorConfig = runtime?.engineEditors?.[plan.target] || {};
  const releaseState = clean(task.releaseState) || 'other';
  const supervisedByEvidence=(task?.evidence||[]).map(clean).includes('supervised-web-build:required');
  const supervisionContract=task?.supervisionContract?.required===true
    ?freeze({...task.supervisionContract,approved:task.supervisionApproved===true})
    :supervisedByEvidence
      ?freeze({
        version:1,mode:'ASSISTANT_SUPERVISED_VIBE_COAUTHORING',required:true,status:'REVIEW_REQUIRED',
        candidateGenerationAllowed:true,automaticPromotionAllowed:false,approvalField:'supervisionApproved',
        stages:freezeList(['SOURCE_AND_DESIGN_READ','GAMEPLAY_LOOP_DECOMPOSITION','SAVE_INPUT_CORE_LOOP_INVARIANT_LOCK','VIBE_IMPLEMENTATION_CANDIDATE','SUPERVISOR_DIFF_AND_PLAYABILITY_REVIEW','MOBILE_AND_RUNTIME_QA','SUPERVISED_PROMOTION']),
        protectedSemantics:freezeList(['GAME_IDENTITY','SAVE_KEY_AND_SAVE_MEANING','CORE_LOOP','PROGRESSION','MOBILE_INPUT','EXISTING_VALID_FEATURES']),
        hardReject:freezeList(['PLACEHOLDER_SOURCE','FAKE_GAMEPLAY','VALIDATION_ONLY_PATCH','UNRELATED_FULL_REWRITE','SAVE_RESET_WITHOUT_MIGRATION','BUTTON_OR_LABEL_ONLY_PASS_CHEAT','BROKEN_MOBILE_INPUT']),
        approved:false,recoveredFromEvidence:true
      })
      :null;
  const supervisionApproved=supervisionContract?task.supervisionApproved===true:true;
  const automaticDeploymentEligible = AUTO_DEPLOY_STATES.has(releaseState)
    && ['roblox','web','unity'].includes(plan.target)
    && task.requiresOwnerDecision !== true
    && task.protectedChange !== true
    && supervisionApproved;
  const learningGuidance = buildLearningGuidance(plan.learning);
  const verifiedCapabilityMemory=retrieveVerifiedCapabilities({experienceInput:experience,task:{...task,target:plan.target},limit:5});
  const verifiedCapabilityMemoryGuidance=verifiedCapabilityGuidance(verifiedCapabilityMemory);
  const unifiedLearning = retrieveUnifiedLearning({
    task:{ ...task, target:plan.target, taskType:presentationTaskType(task) },
    experienceInput:experience,
    codePatternsInput:codePatterns,
    playbooksInput:playbooks,
    practiceDistilledInput:practiceDistilled,
    masteryInput:learningMotorState
  });
  const unifiedLearningGuidance = buildMotorGuidance(unifiedLearning);
  const assetProduction = buildVibeAssetProductionPlan({ task, target:plan.target, repoRoot:process.cwd() });
  const assetGuidance = assetProductionGuidance(assetProduction);
  const presentationQuality = buildPresentationQualityContract(task,plan.target);
  const presentationGuidance = presentationQualityGuidance(presentationQuality);
  const tournament = candidateTournamentPolicy({ task:{...task,target:plan.target}, masteryInput:learningMotorState });
  const codingStrategyPreference=preferredCodingStrategyForTask({task:{...task,target:plan.target},stateInput:learningMotorState});
  const verifiedCodingStrategyGuidance=codingStrategyGuidance(codingStrategyPreference);
  const responsibilityCalibration=responsibilityCalibrationForTask({task:{...task,target:plan.target},stateInput:learningMotorState});
  const regressionHotspotRisk=regressionHotspotRiskForTask({task:{...task,target:plan.target},stateInput:learningMotorState});
  const verifiedCodingRiskGuidance=codingRiskGuidance({calibration:responsibilityCalibration,hotspot:regressionHotspotRisk});
  const architectureDriftRisk=architectureDriftRiskForTask({task:{...task,target:plan.target},stateInput:learningMotorState});
  const verifiedArchitectureDriftGuidance=architectureDriftGuidance(architectureDriftRisk);
  const codingConstitutionRule=codingConstitutionRuleForTask({task:{...task,target:plan.target},stateInput:learningMotorState});
  const verifiedCodingConstitutionGuidance=codingConstitutionGuidance(codingConstitutionRule);
  const candidateStrategy=candidateStrategyRole(variant,codingStrategyPreference);
  const candidateStrategyGuidance=[
    '[CANDIDATE STRATEGY ROLE]',
    `variant=${candidateStrategy.variant}`,
    `strategy=${candidateStrategy.strategy}`,
    candidateStrategy.directive,
    'This role may change implementation approach only. The task-local compiled edit contract, responsible files, protected semantics, and QA remain authoritative.'
  ].join('\n');
  const reusedContexts = reusableContextsForTask(handoff || {}, task);
  const reusedGuidance = buildReusableHandoffGuidance(reusedContexts);
  const workPackage=freeze({
    id:clean(task.packageId)||null,
    goal:clean(task.packageGoal)||null,
    role:clean(task.packageRole)||null,
    owner:clean(task.packageOwner)||null,
    taskWorkUnits:Number(task.taskWorkUnits||0),
    packageWorkUnits:Number(task.packageWorkUnits||0),
    packageSize:Number(task.packageSize||0),
    longWorkProtected:task.packageLongWorkProtected===true,
    sharedContext:task.packageContext||null,
    completionCriteria:freezeList(task.completionCriteria||[]),
    rolePlan:freeze({
      exploration:'read-only-exploration-worker',
      implementation:'source-worker-exclusive-write',
      test:'incremental-qa-worker-read-only',
      performance:'performance-sanity-worker-read-only',
      regression:'single-fan-in-regression-worker-read-only',
      review:'fan-in-package-review-worker-read-only'
    })
  });
  const packageGuidance=workPackage.id?[
    `[WORK PACKAGE ${workPackage.id}]`,
    workPackage.goal||'',
    `역할=${workPackage.role||'implementation'}; taskWorkUnits=${workPackage.taskWorkUnits}; packageWorkUnits=${workPackage.packageWorkUnits}`,
    workPackage.sharedContext?.responsibleFiles?.length?`공유 준비 범위=${workPackage.sharedContext.responsibleFiles.join(', ')}`:'',
    `역할 분리=${Object.entries(workPackage.rolePlan).map(([k,v])=>`${k}:${v}`).join(' | ')}`,
    workPackage.completionCriteria.length?`완료 기준=${workPackage.completionCriteria.join(' | ')}`:''
  ].filter(Boolean).join('\n'):'';
  const supervisionGuidance=supervisionContract?[
    '[SUPERVISED WEB GAME COAUTHORING]',
    'This is a supervised major Web build. Generate a real implementation candidate, but do not assume it is approved for promotion.',
    'Preserve: '+(supervisionContract.protectedSemantics||[]).join(', '),
    'Hard reject conditions: '+(supervisionContract.hardReject||[]).join(', '),
    'The candidate must be independently playable and reviewable; validation-only patches, placeholder source, and unrelated rewrites are forbidden.',
    supervisionApproved?'Supervised approval is already recorded.':'Supervised approval is NOT recorded; automatic promotion must remain blocked.'
  ].join('\n'):'';
  const responsibleFiles = freezeList(task.responsibleFiles || []);
  const compiledWorkContract = compileVibeCentralWorkContract({
    snapshot:centralPolicy,
    task:{...task,supervisionApproved},
    plan,
    route,
    responsibleFiles,
    presentationQuality,
    supervisionContract,
    mainSha:clean(process.env.VIBE2_BASE_MAIN_SHA)||clean(process.env.GITHUB_SHA)||'',
    livePolicyRef:clean(centralPolicyLiveRef)
  });
  const centralWorkContractGuidance = compiledWorkContractGuidance(compiledWorkContract);
  const executionGoal = [packageGuidance, reusedGuidance, task.goal, centralWorkContractGuidance, neuralGuidance, supervisionGuidance, presentationGuidance, candidateStrategyGuidance, designIntelligence.guidance, learningGuidance, verifiedCapabilityMemoryGuidance, unifiedLearningGuidance, verifiedCodingStrategyGuidance, verifiedCodingRiskGuidance, verifiedArchitectureDriftGuidance, verifiedCodingConstitutionGuidance, assetGuidance].filter(Boolean).join('\n\n');
  const sourceRootBootstrapAllowed=plan.target==='web'
    &&(task.evidence||[]).includes('source-root-bootstrap-required')
    &&/SOURCE_ROOT_BOOTSTRAP_ALLOWED/.test(clean(task.goal))
    &&responsibleFiles.length===1
    &&/\/index\.html$/i.test(clean(responsibleFiles[0]));
  const qa = freezeList([
    ...(plan.qa || []),
    'design-intelligence-contract',
    'verified-learning-motor-contract',
    'asset-production-plan-contract',
    'asset-runtime-visual-qa-required',
    ...(presentationQuality.required?['presentation-quality-static-check','presentation-quality-runtime-check','presentation-gameplay-semantics-preservation']:[]),
    ...(supervisionContract?['supervised-web-build-contract','supervised-promotion-approval-required']:[]),
    'exploration-handoff-required-before-implementation',
    'auto-player-evidence-after-implementation',
    'telemetry-evidence-after-implementation',
    'performance-sanity-after-implementation',
    'fan-in-regression-before-package-review',
    'design-review-before-experience-promotion'
  ]);

  return freeze({
    ...base, run:true, reason:'WORK_READY', selectedTask:task, taskId:task.id, gameId:task.gameId,
    target:plan.target, shard:task.shard, sourceRootLock:task.sourceRoot || adapter.source.root,
    workMode:route.route==='analysis-only'?'analysis-only':route.route==='engine-editor'?'engine-editor-task':'source-change-candidate',
    executionRoute:route.route, route, goal:executionGoal, originalGoal:task.goal, department:task.department, priority:task.priority, releaseState, maxWorkMinutes,
    source:freeze({
      root:adapter.source.root, writable:adapter.mayWriteSource, maintenanceOnly:adapter.source.maintenanceOnly === true,
      candidateFiles:freezeList(adapter.source.candidateFiles), textWritablePatterns:freezeList(adapter.source.textWritablePatterns || []),
      editorRequiredPatterns:freezeList(adapter.source.editorRequiredPatterns || []), ignoredPaths:freezeList(adapter.source.ignoredPaths), responsibleFiles
    }),
    qa, incrementalQa:incrementalQaPlan(task, plan.target, responsibleFiles, tournament.candidateCount),
    supervisionContract,
    compiledWorkContract,
    neuralDiagnosis,
    workPackage,
    reusedMachineContext:freeze({used:reusedContexts.length>0,count:reusedContexts.length,contexts:freeze(reusedContexts)}),
    designIntelligence,
    verifiedCapabilityMemory,
    unifiedLearning,
    assetProduction,
    presentationQuality,
    candidateTournament:tournament,
    candidateStrategyRole:candidateStrategy,
    codingStrategyPreference,
    responsibilityCalibration,
    regressionHotspotRisk,
    architectureDriftRisk,
    codingConstitutionRule,
    learning:plan.learning, learningAppliedToWorkerGoal:Boolean(learningGuidance||verifiedCapabilityMemoryGuidance||unifiedLearningGuidance), verifiedCapabilityMemoryAppliedToWorkerGoal:Boolean(verifiedCapabilityMemoryGuidance), motion:plan.motion, executionGate:plan.executionGate,
    deployment:freeze({ automaticEligible:automaticDeploymentEligible, requiresVerifiedQA:true, requiresBuild:['roblox','unity'].includes(plan.target), promoteSourceRootOnly:true, mainDirectWriteByWorker:false, publicStoreReleaseAutomatic:false }),
    editor:freeze({ required:route.requiresEditor, runtime:route.editorRuntime || adapter?.execution?.editorRuntime || null, dispatchConfigured:route.route!=='engine-editor' || Boolean(clean(editorConfig.workflow)||clean(editorConfig.runnerLabel)), workflow:clean(editorConfig.workflow)||null, runnerLabel:clean(editorConfig.runnerLabel)||null }),
    workerPolicy:freeze({
      isolatedCandidateBranch:true, directMainWrite:false, verifiedCommitRequired:true, retryLimit:task.maxRetries,
      paidAIAllowed:false, paidRunnerAllowed:false, engineMustResolveGameplayResults:true, protectedGameplayMutationAutomatic:false,
      binaryAssetsDirectTextEditForbidden:true, textWorkerAllowed:route.route==='text-source-worker',
      vibeOwnsAssetProductionDecision:true,
      webDirectAssetAuthoringAllowed:plan.target==='web',
      companyAssetReuseCandidateOnly:true,
      authoringGeneratorRequestAllowed:true,
      authoringGeneratorRequestIsNotCompletion:true,
      explorationRequired:true, explorationWorker:'tools/vibe2-exploration-worker.mjs', explorationSourceWrite:false,
      centralPolicyFreshnessRequired:compiledWorkContract.required===true,
      centralPolicyMismatchAction:compiledWorkContract.freshness?.mismatchAction||null,
      sourceRootBootstrapAllowed,
      roleSeparation:true, sameFileParallelWrite:false,
      neuralDiagnosisMode:'PHASE1_SHADOW_ADVISORY', neuralDiagnosisMayReorderWave:false, neuralDiagnosisMayCreateWorker:false,
      speculativeParallelism:tournament.candidateCount>1, speculativeVariants:tournament.candidateCount
    })
  });
}

export function runVibeContinuousRunner({ runtimeFile='vibe2-runtime.json', queueFile='', controlFile='', experienceFile='', projectLifecycleFile='', outputFile='', taskId='', variant='primary', learningMotorStateFile='', codePatternsFile='', playbooksFile='', practiceDistilledFile='', centralPolicyLiveRef='' } = {}) {
  const runtime = readJson(runtimeFile, {});
  const resolvedQueueFile = clean(queueFile) || clean(runtime?.sources?.queue) || '.vibe2/queue.json';
  const resolvedControlFile = clean(controlFile) || clean(runtime?.sources?.parallelism) || clean(runtime?.adaptiveBackpressure?.stateFile) || '.vibe2/parallelism-control.json';
  const resolvedExperienceFile = clean(experienceFile) || clean(runtime?.sources?.experience) || '.vibe2/experience.json';
  const resolvedOutputFile = clean(outputFile) || clean(runtime?.sources?.workOrder) || '.vibe2/work-order.json';
  const handoff = generateVibe2Handoff({ runtimeFile, queueFile:resolvedQueueFile, controlFile:resolvedControlFile, experienceFile:resolvedExperienceFile, projectLifecycleFile:clean(projectLifecycleFile) });
  const learningMotorState = readJson(clean(learningMotorStateFile)||'.vibe2/learning-motor-state.json', {});
  const codePatterns = readJson(clean(codePatternsFile)||'.vibe2/code-pattern-library.json', readJson('company-learning/vibe2-code-pattern-library.json',{patterns:[]}));
  const playbooks = readJson(clean(playbooksFile)||'company-learning/vibe3-task-playbooks.json', {taskTypes:{}});
  const resolvedPracticeDistilledFile=clean(practiceDistilledFile)||clean(runtime?.sources?.practiceDistilledKnowledge)||'.vibe2/practice-distilled-knowledge.json';
  const practiceDistilled=readJson(resolvedPracticeDistilledFile,{entries:[]});
  const centralPolicySnapshot=loadCentralPolicySnapshot({repoRoot:path.dirname(path.resolve(runtimeFile)),required:true});
  const resolvedCentralPolicyLiveRef=clean(centralPolicyLiveRef)||clean(process.env.VIBE2_CENTRAL_POLICY_LIVE_REF)||'origin/main';
  const order = buildVibeContinuousWorkOrder({ runtime, queue:readJson(resolvedQueueFile, { tasks:[] }), experience:readJson(resolvedExperienceFile, { records:[] }), handoff, taskId, variant, learningMotorState, codePatterns, playbooks, practiceDistilled, centralPolicySnapshot, centralPolicyLiveRef:resolvedCentralPolicyLiveRef });
  writeJson(resolvedOutputFile, order);
  return order;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = parseArgs();
  const order = runVibeContinuousRunner({
    runtimeFile:clean(args.runtime)||'vibe2-runtime.json', queueFile:clean(args.queue), controlFile:clean(args.control), experienceFile:clean(args.experience), projectLifecycleFile:clean(args['project-lifecycle']), outputFile:clean(args.output), taskId:clean(args['task-id']), variant:clean(args.variant)||'primary',
    learningMotorStateFile:clean(args['learning-motor-state']), codePatternsFile:clean(args['code-patterns']), playbooksFile:clean(args.playbooks), practiceDistilledFile:clean(args['practice-distilled']), centralPolicyLiveRef:clean(args['central-policy-live-ref'])
  });
  console.log(`VIBE2_CONTINUOUS_RUN=${order.run?'YES':'NO'}`);
  console.log(`VIBE2_CONTINUOUS_REASON=${order.reason}`);
  console.log(`VIBE2_MACHINE_HANDOFF=${order.machineHandoff?.used?'USED':'NOT_USED'}`);
  console.log(`VIBE2_MACHINE_STATE=${order.machineHandoff?.consistency?.ok?'CONSISTENT':'INCONSISTENT'}`);
  console.log(`VIBE2_MACHINE_PERSISTENT_MAX=${order.machineHandoff?.currentPersistentMax||0}`);
  if (order.designIntelligence) {
    console.log(`VIBE2_DESIGN_INTELLIGENCE=ENABLED`);
    console.log(`VIBE2_DESIGN_IMPLEMENTATION_GATE=${order.designIntelligence.implementationGate.allowed?'PASS':'BLOCKED'}`);
  }
  if (order.run) {
    console.log(`VIBE2_TASK_ID=${order.taskId}`);
    console.log(`VIBE2_TARGET=${order.target}`);
    console.log(`VIBE2_SHARD=${order.shard}`);
    console.log(`VIBE2_RELEASE_STATE=${order.releaseState}`);
    console.log(`VIBE2_AUTO_DEPLOY_ELIGIBLE=${order.deployment.automaticEligible?'YES':'NO'}`);
    console.log(`VIBE2_EXECUTION_ROUTE=${order.executionRoute}`);
    console.log(`VIBE2_SOURCE_ROOT=${order.source.root}`);
    console.log(`VIBE2_INCREMENTAL_QA=YES`);
    console.log(`VIBE2_SPECULATIVE_VARIANTS=${order.incrementalQa.speculativeVariants}`);
    console.log(`VIBE2_CANDIDATE_TOURNAMENT_VARIANTS=${order.candidateTournament?.candidateCount||1}`);
    console.log(`VIBE2_UNIFIED_EXPERIENCE_COUNT=${order.unifiedLearning?.experience?.length||0}`);
    console.log(`VIBE2_VERIFIED_CAPABILITY_COUNT=${order.verifiedCapabilityMemory?.count||0}`);
    console.log(`VIBE2_VERIFIED_CAPABILITY_APPLIED=${order.verifiedCapabilityMemoryAppliedToWorkerGoal?'YES':'NO'}`);
    console.log(`VIBE2_SAME_GAME_EXPERIENCE_COUNT=${(order.unifiedLearning?.experience||[]).filter(x=>(x.reasons||[]).includes('same-game')).length}`);
    console.log(`VIBE2_VERIFIED_CODE_PATTERN_COUNT=${order.unifiedLearning?.codePatterns?.length||0}`);
    console.log(`VIBE2_VERIFIED_PRACTICE_DISTILLED_COUNT=${order.unifiedLearning?.practiceDistilled?.length||0}`);
    console.log(`VIBE2_CANDIDATE_STRATEGY_ROLE=${order.candidateStrategyRole?.strategy||'NONE'}`);
    console.log(`VIBE2_RESPONSIBILITY_CALIBRATION=${order.responsibilityCalibration?.recommendation||'NONE'}`);
    console.log(`VIBE2_REGRESSION_HOTSPOT_RISK=${order.regressionHotspotRisk?.riskLevel||'LOW'}`);
    console.log(`VIBE2_ARCHITECTURE_DRIFT_MEMORY_RISK=${order.architectureDriftRisk?.riskLevel||'LOW'}`);
    console.log(`VIBE2_CODING_CONSTITUTION_RULE=${order.codingConstitutionRule?.matched===true?order.codingConstitutionRule.id:'NONE'}`);
    console.log(`VIBE2_CODING_STRATEGY_PREFERENCE=${order.codingStrategyPreference?.strategy||'NONE'}`);
    console.log(`VIBE2_CODING_STRATEGY_PREFERENCE_STATE=${order.codingStrategyPreference?.state||'NONE'}`);
    console.log(`VIBE2_ASSET_DECISION_COUNT=${order.assetProduction?.decisions?.length||0}`);
    console.log(`VIBE2_EXPERIENCE_CONTEXT_APPLIED=${order.learningAppliedToWorkerGoal?'YES':'NO'}`);
    console.log(`VIBE2_REUSABLE_HANDOFF_CONTEXT=${order.reusedMachineContext?.used?'YES':'NO'}`);
    console.log(`VIBE2_ROLE_SEPARATION=${order.workerPolicy?.roleSeparation?'YES':'NO'}`);
    console.log(`VIBE2_CENTRAL_POLICY_LIVE_REF=${order.compiledWorkContract?.freshness?.liveMainRef||'NONE'}`);
  }
}
