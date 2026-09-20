// 파일명: tools/vibe2-neural-event-telemetry.mjs
// 역할: durable neural-event-shadow 증거를 큐 단위 관측 텔레메트리로 집계한다.
// 원칙: 관측·집계만 하며 품질 승자 선정, 자동 튜닝, 실행 권한 부여를 하지 않는다.

const clean=value=>String(value??'').trim();

export function parseNeuralEventShadowEvidence(values=[]){
  const rows=[];
  for(const raw of Array.isArray(values)?values:[]){
    const value=clean(raw);
    if(!value.startsWith('neural-event-shadow:'))continue;
    try{
      const payload=JSON.parse(decodeURIComponent(value.slice('neural-event-shadow:'.length)));
      if(payload&&typeof payload==='object')rows.push(payload);
    }catch{}
  }
  return rows;
}

function increment(map,key){
  const normalized=clean(key)||'UNKNOWN';
  map[normalized]=(map[normalized]||0)+1;
}

export function summarizeNeuralEventShadowEvidence(values=[]){
  const rows=parseNeuralEventShadowEvidence(values);
  const byEventType={},byAction={},byInhibitor={};
  let hypotheticalFireCount=0;
  let unauthorizedFireCount=0;
  for(const row of rows){
    increment(byEventType,row.eventType);
    increment(byAction,row.actionKind);
    for(const inhibitor of Array.isArray(row.inhibitors)?row.inhibitors:[])increment(byInhibitor,inhibitor);
    if(row.wouldFireWithoutPhase2Authority===true)hypotheticalFireCount+=1;
    if(row.fireAllowed===true||row.workerCreationAllowed===true||row.queueMutationAllowed===true||row.waveReorderAllowed===true)unauthorizedFireCount+=1;
  }
  return{
    version:1,
    mode:'PHASE2_SHADOW_EVENT_TELEMETRY',
    total:rows.length,
    hypotheticalFireCount,
    hypotheticalFireRate:rows.length?hypotheticalFireCount/rows.length:null,
    unauthorizedFireCount,
    byEventType,
    byAction,
    byInhibitor,
    safetyInvariantPass:unauthorizedFireCount===0,
    winnerSelectionAllowed:false,
    automaticTuningAllowed:false,
    automaticLearningAllowed:false,
    phase2AuthorityReady:false,
    interpretationAuthority:'NONE'
  };
}
