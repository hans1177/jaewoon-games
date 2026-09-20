// 파일명: tools/vibe2-neural-root-cause.mjs
// 역할: causal replay + full regression + review 증거와 명시적 책임시스템 검증을 분리해 root-cause 확정을 fail-closed로 판정한다.

const clean=value=>String(value??'').trim();
const uniq=values=>[...new Set((values||[]).map(clean).filter(Boolean))];

function explicitResponsibleSystem(evidence=[]){
  const prefixes=[
    'verified-responsible-system:',
    'runtime-verified-responsible-system:',
    'independent-qa-verified-responsible-system:'
  ];
  for(const value of evidence){
    for(const prefix of prefixes){
      if(value.startsWith(prefix)){
        const system=clean(value.slice(prefix.length)).toUpperCase();
        if(system)return{system,marker:value};
      }
    }
  }
  return null;
}

function causalEvidence(evidence=[]){
  const rows=new Set(evidence);
  return{
    prePatchReproduced:rows.has('causal-replay-prepatch-reproduced:YES'),
    replayExecuted:rows.has('causal-replay-executed:YES'),
    replayPass:rows.has('causal-replay-status:EXECUTED_PASS'),
    regressionPass:rows.has('role-result:regression:PASS'),
    reviewPass:rows.has('role-result:review:PASS')
  };
}

export function verifyNeuralRootCause({diagnosis=null,evidence=[]}={}){
  const rows=uniq(evidence);
  const causal=causalEvidence(rows);
  const responsible=explicitResponsibleSystem(rows);
  const causalRepairVerified=causal.prePatchReproduced&&causal.replayExecuted&&causal.replayPass;
  const independentConfirmation=causal.regressionPass&&causal.reviewPass;
  const predicted=clean(diagnosis?.responsibility?.system).toUpperCase()||null;
  const systemConsistent=Boolean(responsible?.system&&predicted&&responsible.system===predicted);

  let state='UNRESOLVED';
  if(causalRepairVerified&&independentConfirmation&&!responsible)state='CAUSAL_REPAIR_CONFIRMED_SYSTEM_UNVERIFIED';
  else if(causalRepairVerified&&independentConfirmation&&responsible)state='ROOT_CAUSE_VERIFIED';
  else if(causalRepairVerified)state='CAUSAL_REPAIR_VERIFIED_AWAITING_INDEPENDENT_CONFIRMATION';

  const nextEvidenceRequired=[];
  if(!causalRepairVerified){
    if(!causal.prePatchReproduced)nextEvidenceRequired.push('PREPATCH_FAILURE_REPRODUCTION');
    if(!causal.replayPass)nextEvidenceRequired.push('POSTPATCH_CAUSAL_REPLAY_PASS');
  }
  if(causalRepairVerified&&!causal.regressionPass)nextEvidenceRequired.push('FULL_REGRESSION_PASS');
  if(causalRepairVerified&&!causal.reviewPass)nextEvidenceRequired.push('INDEPENDENT_REVIEW_PASS');
  if(causalRepairVerified&&independentConfirmation&&!responsible)nextEvidenceRequired.push('VERIFIED_RESPONSIBLE_SYSTEM_EVIDENCE');

  return{
    version:1,
    mode:'PHASE1_ROOT_CAUSE_VERIFIER',
    state,
    causalRepairVerified,
    independentConfirmation,
    responsibleSystemVerified:Boolean(responsible),
    responsibleSystem:responsible?.system||null,
    responsibleSystemEvidence:responsible?.marker||null,
    predictedResponsibleSystem:predicted,
    predictedSystemConsistentWithVerified:responsible&&predicted?systemConsistent:null,
    evidence:{
      prePatchReproduced:causal.prePatchReproduced,
      replayExecuted:causal.replayExecuted,
      replayPass:causal.replayPass,
      regressionPass:causal.regressionPass,
      reviewPass:causal.reviewPass
    },
    nextEvidenceRequired,
    rootCauseVerified:state==='ROOT_CAUSE_VERIFIED',
    learningEligible:false,
    actionFiringAllowed:false,
    workerCreationAllowed:false,
    waveReorderAllowed:false,
    eventRoutingAuthorityAllowed:false,
    phase2AuthorityEligible:false,
    authority:'VERIFICATION_ONLY_NO_EXECUTION_AUTHORITY'
  };
}

export function neuralRootCauseEvidence(result={}){
  if(clean(result.mode)!=='PHASE1_ROOT_CAUSE_VERIFIER')return[];
  const payload={
    version:1,
    state:clean(result.state)||'UNRESOLVED',
    causalRepairVerified:result.causalRepairVerified===true,
    independentConfirmation:result.independentConfirmation===true,
    responsibleSystemVerified:result.responsibleSystemVerified===true,
    responsibleSystem:clean(result.responsibleSystem)||null,
    predictedResponsibleSystem:clean(result.predictedResponsibleSystem)||null,
    predictedSystemConsistentWithVerified:result.predictedSystemConsistentWithVerified===true?true:result.predictedSystemConsistentWithVerified===false?false:null,
    rootCauseVerified:result.rootCauseVerified===true,
    learningEligible:false,
    actionFiringAllowed:false,
    phase2AuthorityEligible:false,
    nextEvidenceRequired:Array.isArray(result.nextEvidenceRequired)?result.nextEvidenceRequired.slice(0,8):[]
  };
  return[
    `neural-root-cause:${encodeURIComponent(JSON.stringify(payload))}`,
    `neural-root-cause-state:${payload.state}`
  ];
}
