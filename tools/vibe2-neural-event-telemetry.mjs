// 파일명: tools/vibe2-neural-event-telemetry.mjs
// 역할: durable neural event 증거를 큐 단위로 집계하고 shadow/gated 실행을 구분해 안전성을 검증한다.
// 원칙: 텔레메트리는 실행권한을 만들지 않으며 중앙정책이 허용한 gated 실행만 정상으로 집계한다.

const clean=value=>String(value??'').trim();

export function parseNeuralEventShadowEvidence(values=[]){
  const rows=[];
  for(const raw of Array.isArray(values)?values:[]){
    const value=clean(raw);
    const shadow='neural-event-shadow:';
    const gated='neural-event-gated:';
    const prefix=value.startsWith(gated)?gated:(value.startsWith(shadow)?shadow:'');
    if(!prefix)continue;
    try{
      const payload=JSON.parse(decodeURIComponent(value.slice(prefix.length)));
      if(payload&&typeof payload==='object')rows.push({...payload,evidenceMode:prefix===gated?'GATED':'SHADOW'});
    }catch{}
  }
  return rows;
}

function increment(map,key){
  const normalized=clean(key)||'UNKNOWN';
  map[normalized]=(map[normalized]||0)+1;
}

function durableEventIdentity(row={}){
  const eventId=clean(row.eventId);
  if(!eventId)return null;
  if(Number(row.version)===1&&!row.eventIdentityVersion){
    const eventType=clean(row.eventType).toUpperCase()||'UNKNOWN';
    return `${eventId}|${eventType}`;
  }
  return eventId;
}

export function summarizeNeuralEventShadowEvidence(values=[]){
  const parsedRows=parseNeuralEventShadowEvidence(values);
  const byEventId=new Map();
  const legacyRows=[];
  let duplicateEventRows=0,eventConflicts=0;
  for(const row of parsedRows){
    const eventId=durableEventIdentity(row);
    if(!eventId){legacyRows.push(row);continue;}
    if(byEventId.has(eventId)){
      duplicateEventRows+=1;
      if(JSON.stringify(byEventId.get(eventId))!==JSON.stringify(row))eventConflicts+=1;
      continue;
    }
    byEventId.set(eventId,row);
  }
  const rows=[...byEventId.values(),...legacyRows];
  const byEventType={},byAction={},byInhibitor={};
  let hypotheticalFireCount=0;
  let gatedFireCount=0;
  let unauthorizedFireCount=0;
  const gatedActions=new Set(['PREPARE_EXACT_RESPONSIBLE_SYSTEM_REPAIR','PREPARE_DIAGNOSTIC_REVALIDATION','REEVALUATE_DEPENDENCY_AND_LOCKS']);
  for(const row of parsedRows){
    const gated=clean(row.authorityMode).toUpperCase()==='GATED'||row.evidenceMode==='GATED';
    const protectedViolation=row.lockAcquisitionAllowed===true||row.policyMutationAllowed===true||row.authorityPromotionEligible===true;
    const actionViolation=gated&&row.fireAllowed===true&&!gatedActions.has(clean(row.actionKind));
    const shadowViolation=!gated&&(row.fireAllowed===true||row.workerCreationAllowed===true||row.queueMutationAllowed===true||row.waveReorderAllowed===true||row.automaticTuningAllowed===true);
    if(protectedViolation||actionViolation||shadowViolation)unauthorizedFireCount+=1;
    if(gated&&row.fireAllowed===true)gatedFireCount+=1;
  }
  for(const row of rows){
    increment(byEventType,row.eventType);
    increment(byAction,row.actionKind);
    for(const inhibitor of Array.isArray(row.inhibitors)?row.inhibitors:[])increment(byInhibitor,inhibitor);
    if(row.wouldFireWithoutPhase2Authority===true)hypotheticalFireCount+=1;
  }
  return{
    version:3,
    mode:'PHASE2_NEURAL_EVENT_TELEMETRY',
    rawEvidenceRows:parsedRows.length,
    total:rows.length,
    distinctEventIds:byEventId.size,
    identifiedEventCount:byEventId.size,
    legacyUnidentifiedRows:legacyRows.length,
    duplicateEventRows,
    eventConflicts,
    hypotheticalFireCount,
    hypotheticalFireRate:rows.length?hypotheticalFireCount/rows.length:null,
    gatedFireCount,
    gatedFireRate:rows.length?gatedFireCount/rows.length:null,
    unauthorizedFireCount,
    byEventType,
    byAction,
    byInhibitor,
    safetyInvariantPass:unauthorizedFireCount===0,
    winnerSelectionAllowed:false,
    automaticTuningAllowed:gatedFireCount>0,
    automaticLearningAllowed:false,
    phase2AuthorityReady:gatedFireCount>0&&unauthorizedFireCount===0,
    interpretationAuthority:'EVIDENCE_ONLY'
  };
}
