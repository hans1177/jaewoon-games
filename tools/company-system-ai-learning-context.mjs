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

const BOTTLENECK_PLAYBOOK_AUTHORITY='company-learning/platform-release-roadmap.json#aiExecutionEfficiency.systemAiEvolution';
const BOTTLENECK_METHODS=Object.freeze([
  ['CAUSAL_WAIT_GRAPH','대기·실행·fan-in·검증·외부 의존을 하나의 wait-for graph로 묶고 실제 임계경로와 가장 긴 blocking edge부터 줄인다. queue depth만 보고 원인을 결정하지 않는다.'],
  ['CRITICAL_PATH_FIRST','전체 처리량과 완료시간에 직접 영향을 주는 critical path를 먼저 최적화하고 비임계 micro-optimization은 뒤로 미룬다.'],
  ['LITTLE_LAW_FLOW_ACCOUNTING','평균 재공품 WIP, 처리율 throughput, 평균 cycle time의 관계를 함께 본다. WIP 증가가 처리율 증가 없이 체류시간만 늘리면 과잉동시성으로 판정한다.'],
  ['UTILIZATION_KNEE_DETECTION','자원 사용률이 포화점에 가까워질수록 대기시간이 비선형으로 증가하는 구간을 찾고, 최대 사용률이 아니라 처리량 대비 지연의 무릎점 근처를 운영점으로 판단한다.'],
  ['TAIL_LATENCY_PERCENTILES','평균값 대신 p50·p95·p99와 최장 대기를 분리해 본다. 소수 straggler가 전체 fan-in을 막는지 식별한다.'],
  ['SERVICE_DEMAND_DECOMPOSITION','checkout·setup·model warmup·network·compute·shared-state write·verification처럼 서비스 시간을 단계별로 분해해 가장 큰 service demand를 책임 단계에 귀속한다.'],
  ['LOGICAL_PHYSICAL_CAPACITY_SPLIT','논리 동시성 목표와 외부 runner/서비스의 물리 용량을 분리한다. 일시적인 provider 부족을 내부 영구 cap으로 굳히지 않는다.'],
  ['MINIMUM_LOCK_SCOPE','직렬화는 원자적 공유상태 쓰기·정확한 책임파일 충돌·정확한 중복 실행에만 둔다. 넓은 전역 lock과 불필요한 critical section은 축소한다.'],
  ['LOCK_HOLD_TIME_MINIMIZATION','공유 lock 안에서는 읽기·계산·네트워크 작업을 빼고 최종 검증된 원자적 mutation만 수행해 lock hold time을 최소화한다.'],
  ['PRIORITY_INVERSION_CONTROL','저우선 작업이 lock·runner·fan-in 자원을 점유해 고우선 작업을 막는지 탐지하고, 점유시간 축소·우선순위 상속에 준하는 순서 조정·작업 분리를 적용한다.'],
  ['HEAD_OF_LINE_BLOCKING','FIFO 선두의 느린 작업이 뒤의 독립 작업을 막는지 확인하고, 책임영역이 겹치지 않는 작업은 별도 lane 또는 독립 reservation으로 우회가 아니라 정식 병렬 실행한다.'],
  ['CONVOY_BREAKING','하나의 느린 lock holder나 coordinator 뒤에 다수 worker가 몰리는 convoy를 탐지해 공유 critical section을 짧게 하고 독립 단계는 lock 밖으로 이동한다.'],
  ['STAGE_SCOPED_EXACT_DEDUPE','중복 identity를 task+stage+responsibility+revision/checkpoint로 좁힌다. 실행 중 유효 대표는 보존하고 exact queued duplicate만 합친다.'],
  ['THUNDERING_HERD_COALESCING','같은 이벤트로 많은 wake/retry가 동시에 발생하면 결과 없는 wake는 coalesce하고 결과-bearing evidence는 보존해 herd를 억제한다.'],
  ['RETRY_STORM_SUPPRESSION','동일 failure signature의 동시 재시도를 제한하고 대표 canary가 원인을 증명하기 전에는 전체 cohort 재시도를 금지한다.'],
  ['EXPONENTIAL_BACKOFF_WITH_JITTER','외부 transient failure 재시도는 bounded exponential backoff와 jitter를 사용해 동기화된 재시도 파동과 API/runner 재혼잡을 막는다.'],
  ['CIRCUIT_BREAKER_EXTERNAL_DEPENDENCY','외부 서비스가 반복 실패하면 내부 task 실패로 오염시키지 말고 일정 증거 기준으로 circuit을 열어 해당 의존 호출만 일시 중단하고 내부 독립 작업은 계속한다.'],
  ['CAUSE_SCOPED_BACKPRESSURE','backpressure는 병목 원인이 있는 lane·외부 의존·critical section에만 적용한다. 독립 subsystem까지 전역 downshift하지 않는다.'],
  ['ADMISSION_CONTROL_BY_MARGINAL_THROUGHPUT','새 동시 작업을 넣었을 때 marginal throughput이 증가하는지 본다. 증가 없이 queueing/tail latency만 악화되면 신규 admission을 늦추고 기존 in-flight 완료를 우선한다.'],
  ['QUEUE_AGING_AND_STARVATION_GUARD','오래 기다린 runnable 작업은 aging으로 우선순위를 점진적으로 올려 저우선 작업이 영구 starvation 되지 않게 한다.'],
  ['WORK_CONSERVING_DISJOINT_PARALLELISM','충돌 없는 고가치 runnable 작업이 있으면 유휴 슬롯을 비우지 않는다. 한 lane의 실패가 unrelated safe work를 막지 않게 한다.'],
  ['SAFE_WORK_STEALING','worker가 비었을 때 책임파일·checkpoint·authority 충돌이 없는 작업만 다른 queue/lane에서 가져오게 해 유휴시간을 줄인다.'],
  ['CONTROL_PLANE_ISOLATION','reserve·routing·fan-in·supervisor 같은 짧은 control-plane 작업을 긴 compute 작업과 분리해 head-of-line blocking을 줄이되 canonical 상태변경 경로는 하나만 유지한다.'],
  ['EVENT_DRIVEN_REFILL','완료·slot release·verified checkpoint를 refill 신호로 사용하고 주기 polling은 safety net으로만 둔다.'],
  ['CHECKPOINT_PRESERVING_HANDOFF','runner/infra 실패는 stale reservation을 회수하고 마지막 검증 checkpoint에서 다른 worker가 이어간다. 인프라 실패를 task 실패나 학습 패널티로 만들지 않는다.'],
  ['REPRESENTATIVE_CANARY_COHORT','공통 failure signature가 반복되면 impact가 높은 대표 canary 하나에서 원인을 증명한 뒤 cohort 전체에 검증된 수리만 재사용한다.'],
  ['MULTI_HYPOTHESIS_CAUSAL_REPAIR','최소 두 개 이상의 독립 원인가설을 세우고 관찰 증거로 반증한다. correlation만으로 root cause를 확정하지 않는다.'],
  ['COUNTERFACTUAL_BEFORE_AFTER','수리 전후 동일 입력·동일 부하·동일 checkpoint에서 지연/처리율/오류율을 비교해 개선이 우연한 외부 용량 변화인지 분리한다.'],
  ['BOTTLENECK_MIGRATION_DETECTION','한 단계 병목을 줄인 뒤 다음 병목이 다른 단계로 이동하는지 재측정한다. 이전 병목 지표만 계속 최적화하지 않는다.'],
  ['STRAGGLER_HEDGING_WITH_BUDGET','tail straggler에 대한 hedged execution은 spare capacity와 side-effect 안전성이 확인된 경우만 허용하고 첫 검증 성공 시 나머지를 즉시 중단한다.'],
  ['STALE_ORPHAN_SIGNAL_HYGIENE','오래된 orphan·jobless·이미 superseded 상태를 실제 capacity demand와 분리하되 관찰/청소 신호 자체는 숨기지 않는다.'],
  ['STALE_QA_TRIANGULATION','QA 실패는 현재 정책·책임 구현·아키텍처 투영·마지막 검증 행동을 교차검증한다. 구현이 맞을 때만 stale QA를 고치고 assertion 약화는 금지한다.'],
  ['OBSERVABILITY_TO_VERIFIED_LEARNING','wait stage·failure signature·queue/start/end/fan-in timestamps·before/after 효과를 구조화하고 fresh deterministic QA로 확인된 결과만 재사용 지식으로 승격한다.']
]);

function bottleneckTask(task={}){
  const text=[
    clean(task.id),clean(task.taskType),clean(task.goal),clean(task.blocker),clean(task.failureStage),clean(task.failureSignature),
    ...(task.evidence||[]).map(clean),...(task.responsibleFiles||[]).map(clean)
  ].join(' ').toLowerCase();
  return clean(task.taskType).toLowerCase()==='bottleneck-repair'
    ||/(bottleneck|queue|runner|concurr|serial|fan[- ]?in|reservation|backpressure|workflow wait|lock contention|stale qa|control[- ]?plane)/i.test(text);
}

const BOTTLENECK_DIAGNOSTIC_PROTOCOL=Object.freeze([
  {phase:'OBSERVE',requirements:['WAIT_FOR_GRAPH','WIP_THROUGHPUT_CYCLE_TIME','P50_P95_P99_TAIL','SERVICE_DEMAND_BY_STAGE','RESOURCE_UTILIZATION']},
  {phase:'CLASSIFY',requirements:['CAPACITY_VS_CONTENTION_VS_DEPENDENCY_VS_RETRY_VS_STALE_SIGNAL','RUNNABLE_VS_BLOCKED','LOGICAL_VS_PHYSICAL_CAPACITY']},
  {phase:'HYPOTHESIZE',requirements:['AT_LEAST_TWO_CAUSAL_HYPOTHESES','KNOWN_GOOD_COMPARISON_WHEN_AVAILABLE','PRIOR_FAILED_STRATEGY_REJECTION']},
  {phase:'REPAIR',requirements:['MINIMUM_BLAST_RADIUS','PRESERVE_CANONICAL_STATE_PATH','PRESERVE_VALID_IN_FLIGHT_WORK','NO_GLOBAL_DOWNSHIFT_WITHOUT_CAUSE']},
  {phase:'VERIFY',requirements:['SAME_INPUT_LOAD_CHECKPOINT_BEFORE_AFTER','THROUGHPUT_AND_TAIL_LATENCY','NO_QA_SECURITY_AUTHORITY_REGRESSION','BOTTLENECK_MIGRATION_RECHECK']},
  {phase:'LEARN',requirements:['PROMOTE_VERIFIED_OUTCOME_ONLY','ATTRIBUTE_EXACT_KNOWLEDGE_IDS','RECORD_FAILED_STRATEGY_FINGERPRINT','INFRA_FAILURE_NO_KNOWLEDGE_PENALTY']}
]);

function advancedBottleneckPlaybook(task={},policy={}){
  if(!bottleneckTask(task))return{applied:false,scope:'SYSTEM_AI_ONLY',authority:BOTTLENECK_PLAYBOOK_AUTHORITY,methods:[],diagnosticProtocol:[],guidance:''};
  const evolution=policy?.aiExecutionEfficiency?.systemAiEvolution||{};
  const principles=evolution?.principles||{};
  const sensing=evolution?.bottleneckSensing||{};
  const learning=evolution?.verifiedLearningReuseEvolution||{};
  const plan=evolution?.implementationPlan||{};
  const policyReady=
    evolution?.status==='IMPLEMENTED_QA_VERIFIED_ACTIVE_RUNTIME'
    &&evolution?.failureClassification?.required===true
    &&evolution?.workerAutomaticHandoff?.enabled===true
    &&sensing?.enabled===true
    &&sensing?.currentExecutionCapacityRemainsExternalConstraint===true
    &&sensing?.sharedQueueReservationMutationRemainsSerialized===true
    &&evolution?.qaEvolution?.enabled===true
    &&learning?.enabled===true
    &&principles?.duplicateExecutionForbidden===true
    &&principles?.deterministicQaRemainsFinalPassFailAuthority===true
    &&plan?.noShadowPipeline===true;
  if(!policyReady)return{applied:false,authority:BOTTLENECK_PLAYBOOK_AUTHORITY,methods:[],diagnosticProtocol:[],guidance:''};
  const methods=BOTTLENECK_METHODS.map(([id,method])=>({id,method}));
  const diagnosticProtocol=BOTTLENECK_DIAGNOSTIC_PROTOCOL.map(row=>({phase:row.phase,requirements:[...row.requirements]}));
  return{
    applied:true,
    scope:'SYSTEM_AI_ONLY',
    authority:BOTTLENECK_PLAYBOOK_AUTHORITY,
    verifiedPolicyBound:true,
    methods,
    diagnosticProtocol,
    guidance:[
      'POLICY-GROUNDED ADVANCED BOTTLENECK PLAYBOOK (advisory only; fresh verification remains mandatory):',
      ...methods.map(row=>'- '+row.id+': '+row.method),
      'DIAGNOSTIC PROTOCOL:',
      ...diagnosticProtocol.map(row=>'- '+row.phase+': '+row.requirements.join(' -> '))
    ].join('\n')
  };
}

export function buildSystemAiLearningContext({task={},experienceInput={},codePatternsInput={},masteryInput={},policyInput=null}={}){
  const retrieval=retrieveUnifiedLearning({
    task:{...task,target:inferLearningTarget(task),taskType:clean(task.taskType)||'system-ai'},
    experienceInput,codePatternsInput,masteryInput,
    playbooksInput:{},practiceDistilledInput:{entries:[]},externalAiDistilledInput:{entries:[]}
  });
  const exactKnowledgeIds=(retrieval.exactKnowledgeIds||[]).slice(0,20);
  const signature=failureSignature(task);
  const failedStrategies=failedStrategyFingerprints(task);
  const gameId=clean(task.gameId)||null;
  const policy=policyInput&&typeof policyInput==='object'?policyInput:readJson('company-learning/platform-release-roadmap.json',{});
  const bottleneckPlaybook=advancedBottleneckPlaybook(task,policy);
  const baseGuidance=learningGuidance(retrieval);
  return {
    version:2,
    kind:'company-system-ai-verified-learning-context',
    taskId:clean(task.id),
    gameId,
    failureSignature:signature,
    resolvedTarget:inferLearningTarget(task),
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
    guidance:[baseGuidance,bottleneckPlaybook.guidance].filter(Boolean).join('\n'),
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
    policyInput:readJson(clean(a.roadmap)||'company-learning/platform-release-roadmap.json',{})
  });
  writeJson(clean(a.output)||'/tmp/company-system-ai-learning-context.json',result);
  console.log('SYSTEM_AI_VERIFIED_LEARNING_CONTEXT=PASS');
  console.log('SYSTEM_AI_VERIFIED_LEARNING_IDS='+result.exactKnowledgeIds.join(','));
}
