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
