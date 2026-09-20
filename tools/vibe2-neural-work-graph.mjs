// 파일명: tools/vibe2-neural-work-graph.mjs
// 역할: Phase 2 권한 부여 전, 진단/원인/이벤트를 결정론적 neural work graph로 투영한다.
// 원칙: graph는 관찰·감사용 shadow state만 만든다. worker/queue/wave/lock/policy/learning 실행 권한은 절대 부여하지 않는다.

const clean=value=>String(value??'').trim();
const uniq=values=>[...new Set((values||[]).map(clean).filter(Boolean))];
const clamp=value=>Math.max(0,Math.min(1,Number(value)||0));

const NODE_CLASSES=new Set(['GOAL','FACT','HYPOTHESIS','BLOCKER','DEPENDENCY','RISK','ACTION','EVIDENCE']);
const NEURON_TYPES=new Set(['INTENT','SENSOR','FACT','HYPOTHESIS','CAUSAL','BOTTLENECK','RESPONSIBILITY','PLANNING','ACTION','CRITIC','MEMORY','SUPERVISOR']);

function safeId(value=''){
  return clean(value).toLowerCase().replace(/[^a-z0-9._:-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,160)||'unknown';
}
function normalizeEvidence(values=[]){return uniq(Array.isArray(values)?values:[]).slice(0,32);}
function normalizedDependency(row,index){
  if(typeof row==='string')return{id:clean(row)||`dependency-${index+1}`,required:true,state:'UNKNOWN',satisfied:null,evidence:[]};
  const value=row&&typeof row==='object'?row:{};
  const state=clean(value.state).toUpperCase()||'UNKNOWN';
  const explicitSatisfied=typeof value.satisfied==='boolean'?value.satisfied:null;
  const stateSatisfied=['PASS','READY','DONE','SATISFIED','AVAILABLE','UNLOCKED'].includes(state);
  const stateBlocked=['FAIL','FAILED','BLOCKED','MISSING','UNSATISFIED','WAITING'].includes(state);
  return{
    id:clean(value.id||value.name)||`dependency-${index+1}`,
    required:value.required!==false,
    state,
    satisfied:explicitSatisfied??(stateSatisfied?true:(stateBlocked?false:null)),
    evidence:normalizeEvidence(value.evidence||[])
  };
}
function node({
  id,
  nodeClass,
  neuronType,
  label='',
  inputs=[],
  activationScore=0,
  confidence=0,
  dependencies=[],
  inhibitors=[],
  outputs=[],
  evidence=[]
}={}){
  const normalizedClass=NODE_CLASSES.has(clean(nodeClass).toUpperCase())?clean(nodeClass).toUpperCase():'EVIDENCE';
  const normalizedNeuron=NEURON_TYPES.has(clean(neuronType).toUpperCase())?clean(neuronType).toUpperCase():'SENSOR';
  const normalizedInhibitors=uniq(inhibitors);
  const score=clamp(activationScore);
  return{
    id:safeId(id),
    nodeClass:normalizedClass,
    neuronType:normalizedNeuron,
    label:clean(label)||null,
    inputs:uniq(inputs),
    activation:{
      score:Number(score.toFixed(4)),
      state:normalizedInhibitors.length?'INHIBITED':(score>0?'SHADOW_ACTIVE':'DORMANT')
    },
    confidence:Number(clamp(confidence).toFixed(4)),
    dependencies:uniq(dependencies),
    inhibitors:normalizedInhibitors,
    outputs:uniq(outputs),
    evidence:normalizeEvidence(evidence),
    lastFiredAt:null
  };
}
function edge(from,to,relation,confidence=1){
  return{from:safeId(from),to:safeId(to),relation:clean(relation).toUpperCase()||'RELATED_TO',confidence:Number(clamp(confidence).toFixed(4)),verified:false};
}
function rootCauseVerified(rootCause={}){return rootCause?.rootCauseVerified===true||clean(rootCause?.state).toUpperCase()==='ROOT_CAUSE_VERIFIED';}
function actionInhibitors({route={},dependencies=[],resourceState={}}={}){
  const out=[...(route?.inhibitors||[])];
  for(const dep of dependencies){
    if(dep.required&&dep.satisfied===false)out.push(`DEPENDENCY_UNSATISFIED:${safeId(dep.id)}`);
    if(dep.required&&dep.satisfied===null)out.push(`DEPENDENCY_UNVERIFIED:${safeId(dep.id)}`);
  }
  if(resourceState?.lockConflict===true)out.push('SOURCE_OR_RESOURCE_LOCK_CONFLICT');
  if(resourceState?.securityBlocked===true)out.push('SECURITY_POLICY_BLOCK');
  if(resourceState?.policyFresh===false)out.push('CENTRAL_POLICY_STALE_OR_INVALID');
  return uniq(out);
}
function nodeCounts(nodes=[]){
  const byClass={},byNeuronType={};
  for(const row of nodes){
    byClass[row.nodeClass]=(byClass[row.nodeClass]||0)+1;
    byNeuronType[row.neuronType]=(byNeuronType[row.neuronType]||0)+1;
  }
  return{byClass,byNeuronType};
}

export function buildNeuralWorkGraph({
  event={},
  diagnosis=null,
  rootCause=null,
  route=null,
  dependencies=[],
  resourceState={}
}={}){
  const eventId=clean(event?.id||route?.event?.id)||null;
  const eventType=clean(event?.type||route?.event?.type).toUpperCase()||'UNKNOWN';
  const eventEvidence=normalizeEvidence(event?.evidence||route?.event?.evidence||[]);
  const normalizedDependencies=(Array.isArray(dependencies)?dependencies:(Array.isArray(event?.dependencies)?event.dependencies:[]))
    .map(normalizedDependency);
  const nodes=[],edges=[];
  const sensorId=`sensor:${eventId||eventType.toLowerCase()}`;
  nodes.push(node({
    id:sensorId,nodeClass:'EVIDENCE',neuronType:'SENSOR',
    label:`${eventType} event`,activationScore:1,confidence:1,
    outputs:['EVENT_OBSERVED'],evidence:eventEvidence
  }));

  const facts=Array.isArray(diagnosis?.facts)?diagnosis.facts:[];
  for(const [index,fact] of facts.entries()){
    const id=`fact:${fact?.id||index+1}`;
    nodes.push(node({
      id,nodeClass:'FACT',neuronType:'FACT',label:fact?.value||fact?.id,
      inputs:[sensorId],activationScore:1,confidence:fact?.verified===false ? 0.5 : 1,
      outputs:['VERIFIED_STATE'],evidence:[fact?.value, fact?.source]
    }));
    edges.push(edge(sensorId,id,'OBSERVED_AS',1));
  }

  const hypotheses=Array.isArray(diagnosis?.hypotheses)?diagnosis.hypotheses:[];
  for(const [index,hypothesis] of hypotheses.entries()){
    const id=`hypothesis:${hypothesis?.id||index+1}`;
    nodes.push(node({
      id,nodeClass:'HYPOTHESIS',neuronType:'HYPOTHESIS',label:hypothesis?.reason||hypothesis?.system,
      inputs:[sensorId],activationScore:hypothesis?.confidence||0,confidence:hypothesis?.confidence||0,
      outputs:[clean(hypothesis?.system)||'UNKNOWN'],evidence:[hypothesis?.reason]
    }));
    edges.push(edge(sensorId,id,'SUPPORTS_HYPOTHESIS',hypothesis?.confidence||0));
  }

  const rootVerified=rootCauseVerified(rootCause||{});
  if(rootCause&&typeof rootCause==='object'){
    const rootId='root-cause';
    nodes.push(node({
      id:rootId,nodeClass:rootVerified?'FACT':'HYPOTHESIS',neuronType:'CAUSAL',
      label:clean(rootCause?.responsibleSystem)||clean(rootCause?.state)||'root cause',
      inputs:hypotheses.map((h,index)=>`hypothesis:${h?.id||index+1}`),
      activationScore:rootVerified?1:.5,
      confidence:rootVerified?1:Number(rootCause?.confidence||.5),
      outputs:[clean(rootCause?.state)||'UNRESOLVED',clean(rootCause?.responsibleSystem)],
      evidence:[...(rootCause?.evidence||[]),...(rootCause?.nextEvidenceRequired||[])]
    }));
  }

  const responsibility=diagnosis?.responsibility||{};
  if(clean(responsibility?.system)){
    nodes.push(node({
      id:'responsibility',nodeClass:rootVerified?'FACT':'HYPOTHESIS',neuronType:'RESPONSIBILITY',
      label:clean(responsibility.system),inputs:rootCause?['root-cause']:hypotheses.map((h,index)=>`hypothesis:${h?.id||index+1}`),
      activationScore:Number(responsibility?.confidence||0),confidence:Number(responsibility?.confidence||0),
      outputs:[clean(responsibility.system)],evidence:[clean(responsibility?.basis)]
    }));
    if(rootCause)edges.push(edge('root-cause','responsibility','RESOLVES_RESPONSIBILITY',rootVerified?1:Number(responsibility?.confidence||0)));
  }

  if(diagnosis?.bottleneck&&typeof diagnosis.bottleneck==='object'){
    const bottleneckScore=Math.max(0,Math.min(100,Number(diagnosis.bottleneck.score)||0));
    nodes.push(node({
      id:'bottleneck',nodeClass:'BLOCKER',neuronType:'BOTTLENECK',
      label:`bottleneck score ${bottleneckScore}`,inputs:['responsibility'],
      activationScore:bottleneckScore/100,confidence:Number(diagnosis?.responsibility?.confidence||.5),
      outputs:[`BOTTLENECK_SCORE:${bottleneckScore}`]
    }));
    if(nodes.some(x=>x.id==='responsibility'))edges.push(edge('responsibility','bottleneck','BLOCKING_IMPACT',bottleneckScore/100));
  }

  for(const dep of normalizedDependencies){
    const id=`dependency:${dep.id}`;
    const inhibitors=dep.required&&dep.satisfied===false?['DEPENDENCY_UNSATISFIED']:(dep.required&&dep.satisfied===null?['DEPENDENCY_UNVERIFIED']:[]);
    nodes.push(node({
      id,nodeClass:'DEPENDENCY',neuronType:'PLANNING',label:`${dep.id}:${dep.state}`,
      inputs:[sensorId],activationScore:dep.satisfied===true?1:.5,confidence:dep.satisfied===null ? 0.5 : 1,
      inhibitors,outputs:[dep.satisfied===true?'DEPENDENCY_READY':'DEPENDENCY_NOT_READY'],evidence:dep.evidence
    }));
  }

  const routeInhibitors=uniq(route?.inhibitors||[]);
  for(const [index,inhibitor] of routeInhibitors.entries()){
    nodes.push(node({
      id:`risk:${index+1}:${inhibitor}`,nodeClass:'RISK',neuronType:'SUPERVISOR',
      label:inhibitor,inputs:[sensorId],activationScore:1,confidence:1,
      outputs:['INHIBIT_ACTION'],evidence:[inhibitor]
    }));
  }

  const recommendation=diagnosis?.actionRecommendation||{};
  if(clean(recommendation?.mode)||clean(recommendation?.failureStage)){
    nodes.push(node({
      id:'plan',nodeClass:'ACTION',neuronType:'PLANNING',
      label:clean(recommendation?.mode)||'EXACT_FAILURE_STAGE_REPAIR',
      inputs:['responsibility','bottleneck'].filter(id=>nodes.some(x=>x.id===id)),
      activationScore:recommendation?.blocked===true?0:.8,
      confidence:Number(diagnosis?.responsibility?.confidence||.5),
      inhibitors:recommendation?.blocker?[recommendation.blocker]:[],
      outputs:[clean(recommendation?.failureStage),clean(recommendation?.responsibleSystem)],
      evidence:[recommendation?.preserveAlreadyPassedStages===true?'PRESERVE_ALREADY_PASSED_STAGES':'']
    }));
  }

  const proposedAction=route?.proposedAction||{};
  const inhibitors=actionInhibitors({route,dependencies:normalizedDependencies,resourceState});
  const nonAuthorityInhibitors=inhibitors.filter(value=>value!=='PHASE2_EXECUTION_AUTHORITY_NOT_GRANTED');
  const actionKind=clean(proposedAction?.kind)||'OBSERVE_ONLY';
  const hypothetical=route?.wouldFireWithoutPhase2Authority===true&&nonAuthorityInhibitors.length===0&&actionKind!=='OBSERVE_ONLY';
  const actionInputs=[
    nodes.some(x=>x.id==='plan')?'plan':'',
    nodes.some(x=>x.id==='root-cause')?'root-cause':'',
    ...normalizedDependencies.map(dep=>`dependency:${dep.id}`)
  ].filter(Boolean);
  nodes.push(node({
    id:'action',nodeClass:'ACTION',neuronType:'ACTION',label:actionKind,
    inputs:actionInputs,activationScore:hypothetical ? 1 : (actionKind==='OBSERVE_ONLY' ? 0.1 : 0.5),
    confidence:rootVerified?1:Number(diagnosis?.responsibility?.confidence||.5),
    dependencies:normalizedDependencies.map(dep=>dep.id),
    inhibitors,
    outputs:[actionKind,clean(proposedAction?.reason)],
    evidence:[clean(proposedAction?.responsibleSystem),clean(proposedAction?.failureStage)]
  }));
  for(const input of actionInputs)edges.push(edge(input,'action','FEEDS_ACTION',1));
  for(const [index,inhibitor] of routeInhibitors.entries())edges.push(edge(`risk:${index+1}:${inhibitor}`,'action','INHIBITS',1));

  const counts=nodeCounts(nodes);
  return{
    version:1,
    mode:'PHASE2_SHADOW_NEURAL_WORK_GRAPH',
    graphId:eventId||`event:${eventType.toLowerCase()}`,
    event:{id:eventId,type:eventType},
    nodes,
    edges,
    summary:{
      nodeCount:nodes.length,
      edgeCount:edges.length,
      ...counts,
      actionKind,
      actionActivationState:nodes.find(x=>x.id==='action')?.activation?.state||'DORMANT',
      actionInhibitors:inhibitors,
      wouldActivateWithoutPhase2Authority:hypothetical,
      dependencyCount:normalizedDependencies.length,
      unsatisfiedDependencyCount:normalizedDependencies.filter(dep=>dep.required&&dep.satisfied!==true).length
    },
    authority:{
      executionAllowed:false,
      workerCreationAllowed:false,
      queueMutationAllowed:false,
      waveReorderAllowed:false,
      lockAcquisitionAllowed:false,
      policyMutationAllowed:false,
      automaticLearningAllowed:false,
      authorityPromotionAllowed:false
    },
    currentWaveSchedulerRemainsAuthoritative:true,
    deterministic:true
  };
}

export function neuralWorkGraphEvidence(graph={}){
  if(clean(graph?.mode)!=='PHASE2_SHADOW_NEURAL_WORK_GRAPH')return[];
  const summary=graph.summary||{};
  const payload={
    version:1,
    graphId:clean(graph.graphId)||null,
    eventId:clean(graph?.event?.id)||null,
    eventType:clean(graph?.event?.type)||'UNKNOWN',
    nodeCount:Number(summary.nodeCount||0),
    edgeCount:Number(summary.edgeCount||0),
    byClass:summary.byClass||{},
    byNeuronType:summary.byNeuronType||{},
    actionKind:clean(summary.actionKind)||'OBSERVE_ONLY',
    actionActivationState:clean(summary.actionActivationState)||'DORMANT',
    actionInhibitors:uniq(summary.actionInhibitors||[]),
    wouldActivateWithoutPhase2Authority:summary.wouldActivateWithoutPhase2Authority===true,
    dependencyCount:Number(summary.dependencyCount||0),
    unsatisfiedDependencyCount:Number(summary.unsatisfiedDependencyCount||0),
    executionAllowed:false,
    workerCreationAllowed:false,
    queueMutationAllowed:false,
    waveReorderAllowed:false,
    lockAcquisitionAllowed:false,
    policyMutationAllowed:false,
    automaticLearningAllowed:false,
    authorityPromotionAllowed:false
  };
  return[`neural-work-graph-shadow:${encodeURIComponent(JSON.stringify(payload))}`];
}

export function summarizeNeuralWorkGraphEvidence(values=[]){
  const seen=new Map();
  let rawRows=0,conflicts=0,unauthorizedAuthorityBitCount=0;
  const byAction={},byState={};
  for(const raw of Array.isArray(values)?values:[]){
    const value=clean(raw);
    if(!value.startsWith('neural-work-graph-shadow:'))continue;
    rawRows+=1;
    let row;
    try{row=JSON.parse(decodeURIComponent(value.slice('neural-work-graph-shadow:'.length)));}catch{continue;}
    const id=clean(row.eventId)||clean(row.graphId)||`legacy-${rawRows}`;
    if(seen.has(id)){
      if(JSON.stringify(seen.get(id))!==JSON.stringify(row))conflicts+=1;
      continue;
    }
    seen.set(id,row);
    const action=clean(row.actionKind)||'OBSERVE_ONLY';
    const state=clean(row.actionActivationState)||'DORMANT';
    byAction[action]=(byAction[action]||0)+1;
    byState[state]=(byState[state]||0)+1;
    if([
      row.executionAllowed,row.workerCreationAllowed,row.queueMutationAllowed,row.waveReorderAllowed,
      row.lockAcquisitionAllowed,row.policyMutationAllowed,row.automaticLearningAllowed,row.authorityPromotionAllowed
    ].some(Boolean))unauthorizedAuthorityBitCount+=1;
  }
  return{
    version:1,
    rawRows,
    distinctGraphs:seen.size,
    duplicateRows:Math.max(0,rawRows-seen.size),
    conflicts,
    byAction,
    byState,
    unauthorizedAuthorityBitCount,
    safetyInvariantPass:conflicts===0&&unauthorizedAuthorityBitCount===0,
    executionAuthorityGranted:false,
    automaticPromotionAllowed:false
  };
}
