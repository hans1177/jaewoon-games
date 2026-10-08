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
  ['STALE_QA_TRIANGULATION','QA 실패는 현재 중앙정책·책임 구현·architecture/log projection·최근 검증 동작을 교차검증한다. 구현이 정책과 맞을 때만 stale QA를 고치고 assertion 약화는 금지한다.'],
  ['MULTI_HYPOTHESIS_CAUSAL_REPAIR','최소 두 개의 원인 가설을 증거로 비교하고 반증된 가설을 버린다. known-good와 이전 실패 strategy fingerprint를 이용해 같은 실패 수리를 반복하지 않는다.'],
  ['WORK_CONSERVING_DISJOINT_PARALLELISM','충돌 없는 고가치 작업은 빈 슬롯을 즉시 채우고 unrelated safe work를 계속 진행한다. 한 lane의 실패가 다른 독립 lane을 막지 않게 한다.'],
  ['SPARE_CAPACITY_HEDGING','추측 실행은 남는 물리 용량에서만, 서로 독립된 후보에 한정한다. primary coverage를 먼저 보존하고 중복 side effect가 생기기 전에 fan-in에서 하나로 수렴한다.'],
  ['CAUSE_SCOPED_BACKPRESSURE','압력 조절은 runner queue·checkout network·incremental QA·fan-in 등 실제 병목 원인과 lane에만 적용한다. 전체 시스템을 일괄 downshift하지 않는다.'],
  ['OBSERVABILITY_TO_VERIFIED_LEARNING','failure stage·signature·class와 queue/start/fan-in 시간을 구조화해 수리 전후를 비교한다. 효과가 fresh deterministic QA로 확인된 결과만 재사용 지식으로 승격한다.']
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
