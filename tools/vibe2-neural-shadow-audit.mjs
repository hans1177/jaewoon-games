// 파일명: tools/vibe2-neural-shadow-audit.mjs
// 역할: Shadow Event Router의 가상 결정을 기존 wave/fan-in 실제 결과와 비교 기록한다.
// 원칙: 어느 쪽이 더 낫다고 판정하지 않으며, 생산 권한/학습 권한/자동 승격을 부여하지 않는다.

const clean=value=>String(value??'').trim();

function actualWaveOutcome(review={}){
  if(review?.pass!==true)return'WAVE_REVIEW_BLOCKED';
  if(review?.releaseBlocked===true)return'WAVE_RELEASE_BLOCKED';
  return'WAVE_RELEASE_ELIGIBLE';
}

function comparisonClass(route={},actual=''){
  const proposed=clean(route?.proposedAction?.kind)||'OBSERVE_ONLY';
  const wouldFire=route?.wouldFireWithoutPhase2Authority===true;
  const waveActs=actual==='WAVE_RELEASE_ELIGIBLE';
  if(!wouldFire&&!waveActs)return'BOTH_HOLD_OR_OBSERVE';
  if(wouldFire&&waveActs)return'BOTH_PROCEED_DIFFERENT_ACTION_SEMANTICS';
  if(wouldFire&&!waveActs)return'NEURAL_WOULD_ACT_WAVE_HOLDS';
  if(!wouldFire&&waveActs)return'WAVE_PROCEEDS_NEURAL_HOLDS';
  return proposed==='OBSERVE_ONLY'?'NO_COMPARABLE_ACTION':'UNCLASSIFIED';
}

export function buildNeuralShadowAudit({reviewed=[]}={}){
  const rows=(Array.isArray(reviewed)?reviewed:[])
    .filter(row=>row&&typeof row==='object')
    .map(row=>{
      const route=row.neuralEventRoute&&typeof row.neuralEventRoute==='object'?row.neuralEventRoute:null;
      const actual=actualWaveOutcome(row);
      return{
        taskId:clean(row.taskId)||null,
        sampleId:clean(row.sampleId)||clean(row.taskId)||null,
        actualWaveOutcome:actual,
        proposedAction:clean(route?.proposedAction?.kind)||'NO_ROUTE',
        proposedReason:clean(route?.proposedAction?.reason)||null,
        wouldFireWithoutPhase2Authority:route?.wouldFireWithoutPhase2Authority===true,
        phase2FireAllowed:route?.fireAllowed===true,
        comparisonClass:comparisonClass(route||{},actual),
        rootCauseState:clean(row?.rootCause?.state)||null
      };
    });

  const counts={};
  for(const row of rows)counts[row.comparisonClass]=(counts[row.comparisonClass]||0)+1;

  return{
    version:1,
    mode:'PHASE2_SHADOW_VS_WAVE_AUDIT',
    rows,
    counts,
    sampleCount:rows.length,
    interpretationAuthority:'NONE',
    winnerSelectionAllowed:false,
    automaticTuningAllowed:false,
    automaticLearningAllowed:false,
    phase2AuthorityReady:false,
    reason:'OBSERVATIONAL_COMPARISON_ONLY_REQUIRES_VERIFIED_OUTCOME_QUALITY_AND_EXPLICIT_CENTRAL_POLICY_PROMOTION'
  };
}


export function neuralShadowAuditEvidence(audit={}){
  if(clean(audit.mode)!=='PHASE2_SHADOW_VS_WAVE_AUDIT')return[];
  return (Array.isArray(audit.rows)?audit.rows:[]).map(row=>{
    const payload={
      version:1,
      taskId:clean(row.taskId)||null,
      sampleId:clean(row.sampleId)||clean(row.taskId)||null,
      actualWaveOutcome:clean(row.actualWaveOutcome)||null,
      proposedAction:clean(row.proposedAction)||null,
      proposedReason:clean(row.proposedReason)||null,
      wouldFireWithoutPhase2Authority:row.wouldFireWithoutPhase2Authority===true,
      phase2FireAllowed:row.phase2FireAllowed===true,
      comparisonClass:clean(row.comparisonClass)||null,
      rootCauseState:clean(row.rootCauseState)||null
    };
    return `neural-shadow-wave-audit:${encodeURIComponent(JSON.stringify(payload))}`;
  });
}

export function parseNeuralShadowAuditEvidence(values=[]){
  const rows=[];
  for(const raw of Array.isArray(values)?values:[]){
    const value=clean(raw);
    if(!value.startsWith('neural-shadow-wave-audit:'))continue;
    try{
      const payload=JSON.parse(decodeURIComponent(value.slice('neural-shadow-wave-audit:'.length)));
      if(payload&&typeof payload==='object')rows.push(payload);
    }catch{}
  }
  return rows;
}

export function summarizeDurableNeuralShadowAudit(values=[]){
  const parsedRows=parseNeuralShadowAuditEvidence(values);
  const bySample=new Map();
  const legacyRows=[];
  let duplicateSampleRows=0,sampleConflicts=0;
  for(const row of parsedRows){
    const sampleId=clean(row.sampleId);
    if(!sampleId){legacyRows.push(row);continue;}
    if(bySample.has(sampleId)){
      duplicateSampleRows+=1;
      if(JSON.stringify(bySample.get(sampleId))!==JSON.stringify(row))sampleConflicts+=1;
      continue;
    }
    bySample.set(sampleId,row);
  }
  const rows=[...bySample.values(),...legacyRows];
  const counts={};
  for(const row of rows){
    const key=clean(row.comparisonClass)||'UNKNOWN';
    counts[key]=(counts[key]||0)+1;
  }
  return{
    version:2,
    mode:'PHASE2_DURABLE_SHADOW_VS_WAVE_AUDIT',
    rawEvidenceRows:parsedRows.length,
    sampleCount:rows.length,
    distinctSampleIds:bySample.size,
    legacyUnidentifiedRows:legacyRows.length,
    duplicateSampleRows,
    sampleConflicts,
    counts,
    phase2AuthorityReady:false,
    automaticLearningAllowed:false,
    automaticTuningAllowed:false,
    interpretationAuthority:'NONE'
  };
}
