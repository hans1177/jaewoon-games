// Vibe self-architecture evolution: repeated structural evidence -> proposal -> atomic system task.
import crypto from 'node:crypto';
import { createVibeContinuousQueue } from '../assets/vibe-continuous-queue.js';

const clean=v=>String(v??'').trim();
const lower=v=>clean(v).toLowerCase();
const uniq=xs=>[...new Set((xs||[]).map(clean).filter(Boolean))];
const hash=v=>crypto.createHash('sha256').update(String(v??''),'utf8').digest('hex').slice(0,12);
const occurrenceMarker=evidence=>{const x=(evidence||[]).map(clean).find(v=>v.startsWith('architecture-signal-occurrence-count:'));return x?Number(x.split(':').at(-1))||0:0;};
function neuralExpansionReadiness(controlInput={}){
  const r=controlInput?.neuralExpansionReadiness&&typeof controlInput.neuralExpansionReadiness==='object'
    ?controlInput.neuralExpansionReadiness:{};
  const required=['rule1QaPass','rule2QaPass','rule3QaPass','atomicNeuronFanInQaPass','sharedContextQaPass','securityQaPass'];
  const missing=required.filter(key=>r[key]!==true);
  if(r.pass!==true)missing.push('readinessPass');
  if(clean(r.source)!=='DIRECT_TARGETED_QA')missing.push('directQaSource');
  if(r.internalNeuralStructureExpansionAllowedWhenPass!==true)missing.push('internalExpansionEligibility');
  if(r.neuralExecutionAuthorityExpansionAllowed!==false)missing.push('executionAuthorityInvariant');
  if(r.queueMutationAuthorityExpanded!==false)missing.push('queueAuthorityInvariant');
  if(r.workerCreationAuthorityExpanded!==false)missing.push('workerAuthorityInvariant');
  if(r.gateWeakeningAllowed!==false)missing.push('gateInvariant');
  const uniqueMissing=uniq(missing);
  return Object.freeze({
    pass:uniqueMissing.length===0,
    missing:Object.freeze(uniqueMissing),
    source:clean(r.source)||'RUNTIME_QA_EVIDENCE'
  });
}

const NEURAL_READY_GOAL='제1·2·3규칙, 원자 뉴런/fan-in, shared-context, security QA가 모두 PASS다. 구조적 원인이 타당하면 신경망 노드/연결/라우팅/학습 구조 확대를 대안으로 선택할 수 있다. 신경망 확대는 실행 권한 확대와 다르며 기존 권한은 그대로 유지한다.';
const NEURAL_PENDING_GOAL='신경망 확대 readiness가 아직 PASS가 아니다. 이번 작업은 일반 자기구조 진화만 수행하고 neural expansion은 readiness PASS 이후 다음 구조 진화에서 검토한다.';
function refreshQueuedArchitectureReadiness(queueInput={},readiness={}){
  const refreshed=[];
  const tasks=(queueInput.tasks||[]).map(task=>{
    const status=lower(task?.status),isArchitecture=task?.systemSteward===true&&lower(task?.department)==='system-architecture'&&lower(task?.target)==='system';
    if(!isArchitecture||!['queued','blocked'].includes(status))return task;
    const priorEvidence=(task.evidence||[]).map(clean).filter(Boolean);
    const evidence=priorEvidence.filter(value=>
      !value.startsWith('architecture-neural-expansion-phase:')&&
      !value.startsWith('architecture-neural-expansion-mode:')&&
      !value.startsWith('architecture-neural-expansion-readiness:')&&
      !value.startsWith('architecture-neural-expansion-allowed:')&&
      !value.startsWith('architecture-neural-expansion-missing:')
    );
    evidence.push(
      'architecture-neural-expansion-phase:LAST_STAGE_ONLY',
      'architecture-neural-expansion-mode:EVIDENCE_GATED_SELF_EXPANSION',
      `architecture-neural-expansion-readiness:${readiness.pass?'PASS':'PENDING'}`,
      `architecture-neural-expansion-allowed:${readiness.pass?'YES':'NO'}`,
      'architecture-rule5-atomization-required:YES',
      'architecture-rule5-neuronization-required:YES',
      'architecture-rule5-central-code-sync-required:YES',
      ...(readiness.missing||[]).map(key=>`architecture-neural-expansion-missing:${key}`)
    );
    const completionCriteria=(task.completionCriteria||[])
      .map(clean).filter(Boolean)
      .filter(value=>!value.startsWith('NEURAL_EXPANSION_IF_CHOSEN_REQUIRES_'));
    completionCriteria.push(
      'RULE5_ATOMIC_ARCHITECTURE_DEFINED',
      'RULE5_NEURON_MAPPING_DEFINED',
      'RULE5_CENTRAL_ARCHITECTURE_CODE_TEST_SYNC_PASS'
    );
    if(readiness.pass)completionCriteria.push(
      'NEURAL_EXPANSION_IF_CHOSEN_REQUIRES_CAUSAL_PROOF',
      'NEURAL_EXPANSION_IF_CHOSEN_REQUIRES_BEFORE_AFTER_IMPROVEMENT'
    );
    let goal=clean(task.goal);
    if(goal.includes(NEURAL_READY_GOAL)||goal.includes(NEURAL_PENDING_GOAL)){
      goal=goal.replace(NEURAL_READY_GOAL,readiness.pass?NEURAL_READY_GOAL:NEURAL_PENDING_GOAL)
        .replace(NEURAL_PENDING_GOAL,readiness.pass?NEURAL_READY_GOAL:NEURAL_PENDING_GOAL);
    }
    const next={...task,goal,evidence:uniq(evidence),completionCriteria:uniq(completionCriteria)};
    if(JSON.stringify(next)!==JSON.stringify(task))refreshed.push(clean(task.id));
    return next;
  });
  return{queue:{...queueInput,tasks},refreshed:uniq(refreshed)};
}

function signatureOf(task={}){
  const blocker=clean(task.blocker),outcome=clean(task.lastOutcome);
  if(blocker)return blocker;
  const ev=(task.evidence||[]).map(clean);
  const explicit=ev.find(v=>v.startsWith('system-steward:failure-signature:'));
  if(explicit)return explicit.slice('system-steward:failure-signature:'.length);
  if(ev.includes('system-steward:stale-running-reservation-recovered'))return'stale-running-reservation';
  return outcome||'';
}
function responsibilityFor(signature=''){
  const s=lower(signature);
  if(/neural|neuron|micro.?fan.?in|fan.?in.*root|event.?router|shadow.?event|learning.?routing/.test(s))return[
    'tools/vibe2-neural-event-router.mjs','tools/vibe2-fan-in-review.mjs',
    'qa/vibe2-neural-event-router.test.mjs','qa/vibe2-neural-fanin-root-cause.test.mjs'
  ];
  if(/source-candidate-generation|parallel-candidate-generation|edit.?match|model.*candidate/.test(s))return[
    'tools/vibe2-source-worker.mjs','qa/vibe2-source-worker.test.mjs'
  ];
  if(/fan-in-regression|package-review|candidate-awaiting-qa/.test(s))return[
    'tools/vibe2-queue-control.mjs','.github/workflows/vibe2-continuous-core.yml','qa/vibe2-queue-control.test.mjs'
  ];
  if(/stale.*reservation|machine_state|parallelism|telemetry/.test(s))return[
    'tools/vibe2-system-steward.mjs','tools/vibe2-adaptive-backpressure.mjs','qa/vibe2-system-steward.test.mjs'
  ];
  if(/candidate-.*verification|release.*dispatch|promotion/.test(s))return[
    'tools/vibe2-candidate-reconcile.mjs','.github/workflows/vibe2-candidate-release.yml','qa/vibe2-candidate-reconcile.test.mjs'
  ];
  if(/planner|no-runnable|queue-starvation|refill/.test(s))return[
    'tools/vibe2-auto-planner.mjs','.github/workflows/vibe2-24h-runner.yml','qa/vibe2-auto-planner.test.mjs'
  ];
  return['tools/vibe2-system-steward.mjs','qa/vibe2-system-steward.test.mjs'];
}
function structuralSignals(queue={}){
  const counts=new Map(),generations=new Map();
  for(const task of queue.tasks||[]){
    if(task?.systemSteward===true&&lower(task.department)==='system-architecture')continue;
    const sig=signatureOf(task);
    const status=lower(task.status);
    const repeatedEvidence=(task.evidence||[]).some(v=>/failure-signature|stale-running-reservation-recovered|fan-in-regression/i.test(clean(v)));
    const structural=status==='failed'||status==='blocked'||Number(task.recoveryGeneration||0)>=2||repeatedEvidence;
    if(!sig||!structural)continue;
    counts.set(sig,(counts.get(sig)||0)+1);
    generations.set(sig,Math.max(generations.get(sig)||0,Number(task.recoveryGeneration||0)));
  }
  return[...counts].map(([signature,count])=>({signature,count,recoveryGeneration:generations.get(signature)||0}))
    .filter(x=>x.count>=3||x.recoveryGeneration>=2)
    .sort((a,b)=>b.count-a.count||b.recoveryGeneration-a.recoveryGeneration||a.signature.localeCompare(b.signature));
}
function nextGeneration(queue,signature,count){
  const prefix='SYS-ARCH-'+hash(signature)+'-v';
  const rows=(queue.tasks||[]).filter(t=>clean(t.id).startsWith(prefix)).map(t=>({
    task:t,version:Number(clean(t.id).slice(prefix.length))||0
  })).sort((a,b)=>a.version-b.version);
  if(!rows.length)return 1;
  const latest=rows.at(-1),status=lower(latest.task.status),prior=occurrenceMarker(latest.task.evidence);
  if(['queued','running','blocked','failed'].includes(status))return null;
  if(status==='verified'&&count>prior)return latest.version+1;
  return null;
}
export function injectSelfArchitectureEvolutionTasks(queueInput={},controlInput={}){
  let queue=createVibeContinuousQueue(queueInput);
  const readinessInput=controlInput?.neuralExpansionReadiness&&typeof controlInput.neuralExpansionReadiness==='object'
    ?controlInput.neuralExpansionReadiness:null;
  const readiness=neuralExpansionReadiness(controlInput);
  const readinessExplicit=Boolean(readinessInput&&Object.keys(readinessInput).length);
  const rebound=readinessExplicit
    ?refreshQueuedArchitectureReadiness(queue,readiness)
    :{queue,refreshed:[]};
  if(rebound.refreshed.length)queue=createVibeContinuousQueue(rebound.queue);
  const signals=structuralSignals(queue),added=[];
  for(const signal of signals){
    const generation=nextGeneration(queue,signal.signature,signal.count);
    if(!generation)continue;
    const files=responsibilityFor(signal.signature),id=`SYS-ARCH-${hash(signal.signature)}-v${generation}`;
    added.push({
      id,gameId:'__vibe_system__',target:'system',department:'system-architecture',type:'implementation',
      executionLane:'RECOVERY_FAST',sourceRoot:'.',responsibleFiles:files,dependencies:[],priority:'high',
      releaseState:'other',status:'queued',retries:0,maxRetries:null,retryPolicy:'UNLIMITED_CAUSAL_REPAIR',
      ownerDirective:false,requiresOwnerDecision:false,protectedChange:false,paidResourceRequired:false,
      systemSteward:true,estimatedRisk:'high',speculativeEligible:true,
      goal:[
        '[VIBE_SELF_ARCHITECTURE_EVOLUTION]',
        `structuralSignal=${signal.signature}`,`occurrences=${signal.count}`,`recoveryGeneration=${signal.recoveryGeneration}`,
        '현재 구조 자체가 반복 병목의 원인인지 기존 소스와 근거를 읽고 판단한다.',
        '최소 2개 대안을 비교하고 현재 권한/보안/QA 관문을 유지한 채 가장 작은 인과적 구조 개선을 설계한다.',
        '필요하면 기존 시스템을 재구성하거나 안전한 내부 시스템을 구축하되 wrapper/shadow 중복 시스템은 만들지 않는다.',
        readiness.pass
          ?'제1·2·3규칙, 원자 뉴런/fan-in, shared-context, security QA가 모두 PASS다. 구조적 원인이 타당하면 신경망 노드/연결/라우팅/학습 구조 확대를 대안으로 선택할 수 있다. 신경망 확대는 실행 권한 확대와 다르며 기존 권한은 그대로 유지한다.'
          :'신경망 확대 readiness가 아직 PASS가 아니다. 이번 작업은 일반 자기구조 진화만 수행하고 neural expansion은 readiness PASS 이후 다음 구조 진화에서 검토한다.',
        '제5원칙에 따라 변경 구조를 원자 책임 노드로 분해하고 각 노드의 입력·출력·의존성·억제조건·증거를 정의한 뒤 뉴런 타입/엣지로 매핑한다. 중앙 정책·아키텍처맵·책임 코드·계약 테스트가 일치해야 활성화한다.',
        '구현 후 동일 실패 재현, 전체 관련 회귀, 전후 병목 지표를 비교한다. 개선 증거가 없으면 채택하지 않는다.',
        '실행 권한 확대, gate/threshold 완화, 검증 생략, fabricated PASS, verified learning 삭제는 금지한다.'
      ].join('\n'),
      evidence:[
        'vibe-self-architecture-evolution','architecture-proposal-required','architecture-alternatives-required:2',
        `architecture-signal:${signal.signature}`,`architecture-signal-occurrence-count:${signal.count}`,
        `architecture-recovery-generation:${signal.recoveryGeneration}`,
        'architecture-total-evolution-generation-limit:NONE','architecture-busy-loop-forbidden',
        'architecture-before-after-comparison-required','architecture-regression-required','architecture-security-required','architecture-system-construction-allowed',
        'architecture-authority-expansion:NO','architecture-gate-weakening:NO',
        'architecture-neural-expansion-phase:LAST_STAGE_ONLY',
        'architecture-neural-expansion-mode:EVIDENCE_GATED_SELF_EXPANSION',
        `architecture-neural-expansion-readiness:${readiness.pass?'PASS':'PENDING'}`,
        `architecture-neural-expansion-allowed:${readiness.pass?'YES':'NO'}`,
        'architecture-rule5-atomization-required:YES',
        'architecture-rule5-neuronization-required:YES',
        'architecture-rule5-central-code-sync-required:YES',
        ...readiness.missing.map(key=>`architecture-neural-expansion-missing:${key}`)
      ],
      completionCriteria:[
        'STRUCTURAL_CAUSE_VERIFIED','AT_LEAST_TWO_ALTERNATIVES_COMPARED','DIRECT_RESPONSIBLE_SYSTEM_CHANGED_OR_VERIFIED_NO_CHANGE',
        'SAME_FAILURE_REPRODUCTION_RECHECKED','RELATED_REGRESSION_PASS','SECURITY_PASS','BEFORE_AFTER_METRIC_IMPROVED',
        'AUTHORITY_UNCHANGED','GATES_UNCHANGED','NEURAL_EXECUTION_AUTHORITY_UNCHANGED',
        'RULE5_ATOMIC_ARCHITECTURE_DEFINED','RULE5_NEURON_MAPPING_DEFINED','RULE5_CENTRAL_ARCHITECTURE_CODE_TEST_SYNC_PASS',
        ...(readiness.pass?['NEURAL_EXPANSION_IF_CHOSEN_REQUIRES_CAUSAL_PROOF','NEURAL_EXPANSION_IF_CHOSEN_REQUIRES_BEFORE_AFTER_IMPROVEMENT']:[])
      ]
    });
  }
  if(added.length)queue=createVibeContinuousQueue({maxConcurrentTasks:queue.maxConcurrentTasks,tasks:[...(queue.tasks||[]),...added]});
  return{
    queue,signals,added,refreshed:rebound.refreshed,
    changed:added.length>0||rebound.refreshed.length>0,
    totalGenerationLimit:null,proposalGenerationLimit:null,
    neuralExpansionReadiness:readiness
  };
}
