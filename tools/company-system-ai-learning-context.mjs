// 파일명: tools/company-system-ai-learning-context.mjs
// 역할: System AI 작업 전에 Vibe의 검증된 experience/code-pattern에서 관련 지식만 retrieval한다.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { retrieveUnifiedLearning, learningGuidance } from './vibe2-learning-motor.mjs';

const clean=v=>String(v??'').trim();
function readJson(file,fallback={}){try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}}
function writeJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n','utf8');}
function parseArgs(argv=process.argv.slice(2)){const out={};for(const raw of argv){if(!raw.startsWith('--'))continue;const at=raw.indexOf('=');if(at<0)out[raw.slice(2)]=true;else out[raw.slice(2,at)]=raw.slice(at+1);}return out;}
function failureSignature(task={}){
  if(clean(task.failureSignature))return clean(task.failureSignature);
  const evidence=(task.evidence||[]).map(clean);
  for(const prefix of ['system-ai-failure-signature:','shared-signature:','system-steward:failure-signature:','failure-cause:']){
    const row=[...evidence].reverse().find(x=>x.startsWith(prefix));
    if(row)return clean(row.slice(prefix.length));
  }
  return clean(task.blocker||task.lastOutcome)||null;
}
function failedStrategyFingerprints(task={}){
  return [...new Set([
    ...(task.failedStrategyFingerprints||[]).map(clean),
    ...(task.evidence||[]).map(clean).filter(x=>x.startsWith('failed-strategy-fingerprint:')).map(x=>clean(x.slice('failed-strategy-fingerprint:'.length)))
  ].filter(Boolean))];
}
function inferLearningTarget(task={}){
  const explicit=clean(task.target).toLowerCase();
  if(explicit&&explicit!=='system')return explicit;
  const files=(task.responsibleFiles||[]).map(x=>clean(x).replaceAll('\\','/'));
  if(files.some(x=>x.startsWith('web-games/')))return'web';
  if(files.some(x=>x.startsWith('roblox-games/')))return'roblox';
  if(files.some(x=>x.startsWith('unity-games/')))return'unity';
  if(files.some(x=>x.startsWith('unreal-games/')))return'unreal';
  if(files.some(x=>x.startsWith('godot-games/')))return'godot';
  const department=clean(task.department).toLowerCase();
  if(department==='planning-growth-marketing'||clean(task.id).startsWith('marketing-'))return'marketing';
  return explicit||'system';
}

function systemAiExternalDistilledInput(input={},target='system'){
  const resolved=clean(target).toLowerCase()||'system';
  const shared=new Set(['cross-engine','general','system','shared']);
  const entries=(input?.entries||[]).filter(row=>{
    const engine=clean(row?.engine).toLowerCase();
    return !engine||shared.has(engine)||engine===resolved;
  });
  return{...input,entries};
}

const BOTTLENECK_PLAYBOOK_AUTHORITY='company-learning/platform-release-roadmap.json#aiExecutionEfficiency.systemAiEvolution';
const BOTTLENECK_METHODS=Object.freeze([
  ['CAUSAL_WAIT_GRAPH','대기열·pending workflow·reservation wait·runner startup·fan-in·release wait를 한 그래프로 묶고 가장 긴 실제 대기 경로부터 고친다. 단순 queue depth만 원인으로 취급하지 않는다.'],
  ['LOGICAL_PHYSICAL_CAPACITY_SPLIT','정책상 논리 동시성 목표와 GitHub/외부 제공자 물리 용량을 분리한다. 일시적인 runner 부족을 내부 정책 cap으로 굳히지 않는다.'],
  ['MINIMUM_LOCK_SCOPE','직렬화는 원자적 공유상태 쓰기·정확히 같은 책임 파일 충돌·정확한 중복 실행에만 둔다. 전역·게임 전체·source-root 전체 lock은 병목으로 간주한다.'],
  ['STAGE_SCOPED_EXACT_DEDUPE','중복 억제 identity는 game+stage+source/control revision으로 좁힌다. 이미 실행 중인 유효 작업은 보존하고 queued 중복만 합친다.'],
  ['CONTROL_PLANE_ISOLATION','reserve·refill·fan-in 같은 짧은 control-plane 작업을 무거운 build/runtime worker 압력과 분리해 head-of-line blocking과 convoy를 막는다.'],
  ['EVENT_DRIVEN_REFILL','완료 micro-fan-in과 slot release를 다음 refill 신호로 사용한다. 결과 없는 control wake는 coalesce하되 결과를 가진 완료 이벤트와 증거는 버리지 않는다.'],
  ['CHECKPOINT_PRESERVING_HANDOFF','runner/infra 실패는 stale reservation을 회수하고 마지막 검증 checkpoint에서 다른 worker로 이어간다. 인프라 실패를 작업 실패나 학습 패널티로 만들지 않는다.'],
  ['REPRESENTATIVE_CANARY_COHORT','공통 failure signature가 반복되면 모든 작업을 동시에 재시도하지 말고 대표 canary 하나에서 원인을 증명한 뒤 동일 cohort를 재배선한다.'],
  ['STALE_QA_TRIANGULATION','QA 실패는 최신 main의 중앙정책 4개·책임 구현·Vibe3 실행 계약 투영값·워크플로 검증조건·최근 실행 증거를 동일 리비전으로 교차검증한다. 과거 플랫폼 단계나 Unity Web 선행 입장 조건을 현재 정책에 강제로 되돌리지 않는다. 현재 활성 플랫폼, Android 보류, Unity Web 실제 3D, 고정 논리 슬롯, 브라우저 독립 QA·회귀를 비교한다. 구현이 최신 정책과 맞는 경우에만 오래된 QA 조건을 직접 수정하고 검증 강도와 F0~F9 잠금은 보존한다.'],
  ['MULTI_HYPOTHESIS_CAUSAL_REPAIR','최소 두 개의 원인 가설을 증거로 비교하고 반증된 가설을 버린다. known-good와 이전 실패 strategy fingerprint를 이용해 같은 실패 수리를 반복하지 않는다.'],
  ['WORK_CONSERVING_DISJOINT_PARALLELISM','충돌 없는 고가치 작업은 빈 슬롯을 즉시 채우고 unrelated safe work를 계속 진행한다. 한 lane의 실패가 다른 독립 lane을 막지 않게 한다.'],
  ['SPARE_CAPACITY_HEDGING','추측 실행은 남는 물리 용량에서만, 서로 독립된 후보에 한정한다. primary coverage를 먼저 보존하고 중복 side effect가 생기기 전에 fan-in에서 하나로 수렴한다.'],
  ['CAUSE_SCOPED_BACKPRESSURE','압력 조절은 runner queue·checkout network·incremental QA·fan-in 등 실제 병목 원인과 lane에만 적용한다. 전체 시스템을 일괄 downshift하지 않는다.'],
  ['OBSERVABILITY_TO_VERIFIED_LEARNING','failure stage·signature·class와 queue/start/fan-in 시간을 구조화해 수리 전후를 비교한다. 효과가 fresh deterministic QA로 확인된 결과만 재사용 지식으로 승격한다.'],
  ['ASSET_CONSUMER_CAUSAL_TRIANGULATION','내부 라이브러리 미적용은 tools/vibe2-auto-planner.mjs와 tools/vibe2-asset-production-plan.mjs에서 선언·계획·실제 소비를 분리해 재현한다. STUDIO_ASSET_BINDING_VERSION이나 목록만으로 완료 처리하지 않는다. 소문자 원자 ID, 팩 경로와 Factory.Create까지 이어지는 ID 흐름, Unity 임베디드 렌더 소유 파일을 확인한다. 미사용 선언은 음성 대조군으로 남기고 소스 소비를 런타임 PASS로 승격하지 않는다.'],
  ['EXPLICIT_NATIVE_AUTHORING_REPAIR','명시적인 task.assetAuthoring.sourceModel/sourceImage/module 또는 imageToAsset 요청이 applyFirst 재사용 때문에 누락되는지 검사한다. 기본 내부자산 재사용은 보존하면서 명시된 변환은 기존 native authoring으로 실행하고 원본 해시·상업 이용·파생 권리 검증을 유지한다. Cascadeur/DeepMotion FBX와 MeshAI GLB는 실제 내보낸 원본·파생 산출물·플랫폼 재생 증거를 별도로 확인한다.'],
  ['RUNTIME_BOOT_CAUSE_BEFORE_WAIT','UNITY_WEB_QA_BOOT_MARKER_MISSING은 콘솔 예외·실패 요청·실제 빌드 산출물을 먼저 확인한다. MAGIC_FOREST_PLAYER_GUARDIAN_ACTION_OR_GRIP_MISSING은 WeaponGrip과 Resources.Load<AnimationClip> 및 Animation.AddClip의 실제 액션 바인딩을 분리 검증한다. 부팅 대기 증가나 QA 마커 위조로 통과시키지 않는다. 실제 브라우저 독립 QA·회귀·배포·다음 BUILD_UP까지 확인한다.'],
  ['EXACT_FAILURE_AND_WAKE_IDENTITY','BLOCKED/CLOCK 문자열을 LOCK 경합으로 오분류하지 않도록 company-system-ai-failure-classifier.mjs의 토큰 경계를 회귀검증한다. 24H wake 중복은 동일 최신 main SHA·workflow·execution lane·미시작 상태만 coalesce한다. 실행 중 작업과 다른 리비전·lane은 보존한다. 빈 슬롯인데 reserve 결과가 0이면 책임 파일 충돌과 미회수 immutable 결과·fan-in을 추적하며 정책 슬롯 증설만으로 해결했다고 주장하지 않는다.'],
  ['HOMEPAGE_DEPLOYMENT_VISIBILITY','홈페이지 Unity Web 링크 누락은 assets/homepage-enhancements.js에서 실행 번들 존재·링크 표시·QA 승인·게임 시작을 각각 검증한다. 실제 loader/data/framework/wasm을 확인한 게임은 다른 게임 조회가 끝날 때까지 기다리지 않고 표시한다. 빌드가 없는 게임에는 링크를 만들지 않으며 개발 테스트를 정식 QA PASS로 표시하지 않는다. 공개 홈페이지에서 링크를 클릭하고 실제 Unity 부팅을 확인한다. 검증 브라우저의 WebGL 미지원은 게임 정상 또는 고장 증거가 아니다.']
]);

function bottleneckTask(task={}){
  const text=[
    clean(task.id),clean(task.taskType),clean(task.goal),clean(task.blocker),clean(task.failureStage),clean(task.failureSignature),
    ...(task.evidence||[]).map(clean),...(task.responsibleFiles||[]).map(clean)
  ].join(' ').toLowerCase();
  return clean(task.taskType).toLowerCase()==='bottleneck-repair'
    ||/(bottleneck|queue|runner|concurr|serial|fan[- ]?in|reservation|backpressure|workflow wait|lock contention|stale qa|control[- ]?plane)/i.test(text);
}

function advancedBottleneckPlaybook(task={},policy={}){
  if(!bottleneckTask(task))return{applied:false,authority:BOTTLENECK_PLAYBOOK_AUTHORITY,methods:[],guidance:''};
  const evolution=policy?.aiExecutionEfficiency?.systemAiEvolution||{};
  const parallel=policy?.developmentSpeedExecution?.robloxEndToEndParallelExecution||{};
  const lock=policy?.finalDevelopmentLock?.parallelismBoundary||{};
  const policyReady=
    evolution?.status==='IMPLEMENTED_QA_VERIFIED_ACTIVE_RUNTIME'
    &&evolution?.bottleneckSensing?.enabled===true
    &&evolution?.workerAutomaticHandoff?.enabled===true
    &&evolution?.qaEvolution?.enabled===true
    &&parallel?.workflowLevelGameWideSerializationForbidden===true
    &&lock?.gameWideWorkflowSerializationForbidden===true;
  if(!policyReady)return{applied:false,authority:BOTTLENECK_PLAYBOOK_AUTHORITY,methods:[],guidance:''};
  const methods=BOTTLENECK_METHODS.map(([id,method])=>({id,method}));
  return{
    applied:true,
    authority:BOTTLENECK_PLAYBOOK_AUTHORITY,
    verifiedPolicyBound:true,
    methods,
    guidance:[
      'POLICY-GROUNDED ADVANCED BOTTLENECK PLAYBOOK (advisory only; fresh verification remains mandatory):',
      ...methods.map(row=>'- '+row.id+': '+row.method)
    ].join('\n')
  };
}


/* ── 검증된 지식 검색과 함께 전달할 단계별 원인 가설. 자동 PASS·게이트 우회 권한은 없다. ── */
function developmentFloorRecoveryCase(task={},playbook={}) {
  if(playbook.applied!==true)return null;
  const signature=failureSignature(task)||'';
  const cases={
    ROBLOX_BUILD_PREFLIGHT_BLOCKED:{
      stage:'VIBE_SHARED_MODEL_BUILD_PREFLIGHT',
      hypotheses:['CONCURRENT_PLATFORM_MODE_ADMISSION_MISMATCH','EXACT_SOURCE_PACKAGE_OR_SHARED_MODEL_PREFLIGHT_FAILURE'],
      next:'Verify selectedPlatform, canonical dual-platform execution mode and explicit ROBLOX/UNITY targets against exact built source/artifact evidence. Retry only the existing preflight stage after the responsible contract repair.',
      preserve:'Do not reset verified F0 or runtime checkpoints for the same immutable source/artifact, and do not treat an invalid preflight as PASS.'
    },
    ROBLOX_F0_SOURCE_PREFLIGHT_FAILED:{
      stage:'F0_SOURCE_PREFLIGHT',
      hypotheses:['PACKAGE_SOURCE_REVISION_OR_ARTIFACT_MISMATCH','EXACT_LUAU_OR_ROJO_PREFLIGHT_FAILURE'],
      next:'Compare source revision, artifact hash and failing validator; repair the responsible source and rerun exact F0.',
      preserve:'Previous F0 is reusable only if source and artifact identity are still exact.'
    },
    ROBLOX_RUNTIME_CANDIDATE_DEPLOY_PENDING:{
      stage:'PRIVATE_RUNTIME_CANDIDATE_DEPLOY',
      hypotheses:['GAMEPLAY_QUALITY_BUILDUP_GATE_CURRENT_SOURCE','EXACT_PRIVATE_VALIDATION_DISPATCH_MISSING_OR_SUPERSEDED'],
      next:'Check matching F0 evidence, quality build-up blocker, and release-promotion dispatch logs before retrying an exact private candidate.',
      preserve:'Never publish or claim F1-F9 while a source-quality gate remains active.'
    },
    ROBLOX_OPEN_CLOUD_ENGINE_PROBE_TRANSIENT_FAILURE:{
      stage:'TARGET_PLATFORM_RUNTIME_FOUNDATION',
      hypotheses:['OPEN_CLOUD_TRANSIENT_OR_RATE_LIMIT','MISSING_PERMISSION_OR_WRONG_PLACE_VERSION'],
      next:'Compare HTTP status, scope, place and version with last immutable candidate. Retry transient external probe only with real server evidence.',
      preserve:'Keep exact package and private candidate when still bound; transient failures do not invalidate unrelated F0.'
    },
    ROBLOX_FIRST_FRAME_GROUNDING_EVIDENCE_REQUIRED:{
      stage:'TARGET_PLATFORM_RUNTIME_FOUNDATION',
      hypotheses:['EXACT_OPEN_CLOUD_TASK_WORLD_INITIALIZATION_NOT_OBSERVED','PUBLISHED_PRIVATE_PLACE_BOOTSTRAP_OR_SCRIPT_BINDING_MISMATCH'],
      next:'For the exact private place version compare Open Cloud runtimeWorldReady, basePartCount and spawnCount against the bound package. Check real server initialization before editing gameplay. If no gameplay world ran, repeat only the existing authorized runtime observation; never invent a playable spawn.',
      preserve:'Preserve exact F0 and candidate identity; unobserved world boot is not a runtime PASS and is not proof of game-source failure.',
      sourceRepairRequiresVerifiedCause:true
    },
    ROBLOX_FIRST_FRAME_GROUNDING_FAILED:{
      stage:'TARGET_PLATFORM_RUNTIME_FOUNDATION',
      hypotheses:['VERIFIED_SPAWN_UNSUPPORTED_OR_FLOATING_RELATIVE_TO_COLLIDABLE_GROUND','EXACT_RUNTIME_RAYCAST_SUPPORT_GEOMETRY_MISMATCH'],
      next:'Compare the same exact place/version unsupportedSpawns, floatingSpawns and spawn transforms. Repair only proven responsible world geometry or engine-observation code, then rerun the exact F0 to runtime sequence.',
      preserve:'Keep unrelated verified source checkpoints, but source geometry changes must invalidate the changed package and candidate evidence.',
      sourceRepairRequiresVerifiedCause:true
    },
    'roblox-package-asset-binding-failed':{
      stage:'TARGET_PLATFORM_BUILD_OR_PACKAGE',
      hypotheses:['ASSET_FAMILY_NOT_ACTUALLY_REFERENCED_BY_GAMEPLAY','PACKAGE_MANIFEST_AND_RUNTIME_BINDING_DRIFT'],
      next:'Repair the missing asset family in the canonical game source and regenerate the package before F0. Never relabel a missing binding as PASS.',
      preserve:'Only checkpoints whose source/package fingerprints are unchanged may be reused.'
    }
  };
  const selected=cases[signature]||cases[signature.toUpperCase()]||null;
  if(!selected)return null;
  return{
    signature,stage:selected.stage,hypotheses:selected.hypotheses,
    next:selected.next,preserve:selected.preserve,
    representativeCanaryRequiredForSharedSignature:true,
    sourceRepairRequiresVerifiedCause:selected.sourceRepairRequiresVerifiedCause===true,
    independentVerificationRequired:true,
    reattemptFailedStrategyOnlyWithNewEvidence:true,
    verifiedSuccessPromotionOnly:true
  };
}

export function buildSystemAiLearningContext({task={},experienceInput={},codePatternsInput={},masteryInput={},externalAiDistilledInput={},policyInput=null}={}){
  const resolvedTarget=inferLearningTarget(task);
  const retrieval=retrieveUnifiedLearning({
    task:{...task,target:resolvedTarget,taskType:clean(task.taskType)||'system-ai'},
    experienceInput,codePatternsInput,masteryInput,
    playbooksInput:{},practiceDistilledInput:{entries:[]},externalAiDistilledInput:systemAiExternalDistilledInput(externalAiDistilledInput,resolvedTarget)
  });
  const exactKnowledgeIds=(retrieval.exactKnowledgeIds||[]).slice(0,20);
  const signature=failureSignature(task);
  const failedStrategies=failedStrategyFingerprints(task);
  const gameId=clean(task.gameId)||null;
  const policy=policyInput&&typeof policyInput==='object'?policyInput:readJson('company-learning/platform-release-roadmap.json',{});
  const bottleneckPlaybook=advancedBottleneckPlaybook(task,policy);
  const floorRecovery=developmentFloorRecoveryCase(task,bottleneckPlaybook);
  const baseGuidance=learningGuidance(retrieval);
  return {
    version:2,
    kind:'company-system-ai-verified-learning-context',
    taskId:clean(task.id),
    gameId,
    failureSignature:signature,
    resolvedTarget,
    exactKnowledgeIds,
    domainClassification:retrieval.domainClassification||{primary:[],secondary:[],all:[],ranked:[]},
    priorityOrder:retrieval.priority||[],
    sameGameSameFailurePriority:true,
    crossGameTransformativeAdaptationRequired:true,
    rawCrossGameCopyForbidden:true,
    failedStrategyFingerprints:failedStrategies,
    failedStrategyReuseForbiddenWithoutNewCausalEvidence:true,
    outcomeAttributionRequired:true,
    freshQaRequiredOnReuse:true,
    knowledgeTraceRequired:exactKnowledgeIds.length>0,
    bottleneckPlaybook,
    floorRecovery,
    guidance:[baseGuidance,bottleneckPlaybook.guidance,
      floorRecovery&&('EXACT F0-F9 RECOVERY (hypotheses only, require fresh evidence): '+JSON.stringify(floorRecovery))
    ].filter(Boolean).join('\n'),
    rawModelOutputIncluded:false,
    verifiedOnly:true,
    advisoryOnly:true,
    authorityExpanded:false
  };
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const a=parseArgs();
  const result=buildSystemAiLearningContext({
    task:readJson(clean(a.task),{}),
    experienceInput:readJson(clean(a.experience),{records:[]}),
    codePatternsInput:readJson(clean(a.patterns),{patterns:[]}),
    masteryInput:readJson(clean(a.mastery),{}),
    externalAiDistilledInput:readJson(clean(a['external-ai-distilled']),{entries:[]}),
    policyInput:readJson(clean(a.roadmap)||'company-learning/platform-release-roadmap.json',{})
  });
  writeJson(clean(a.output)||'/tmp/company-system-ai-learning-context.json',result);
  console.log('SYSTEM_AI_VERIFIED_LEARNING_CONTEXT=PASS');
  console.log('SYSTEM_AI_VERIFIED_LEARNING_IDS='+result.exactKnowledgeIds.join(','));
}
