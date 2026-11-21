import fs from 'node:fs';
import path from 'node:path';
// 파일명: tools/vibe2-gemini-free-rotation.mjs
// 메인: 기존 Gemini 소스·학습 공용 API 요청 안에서만 무료 공급자 대체 순환.
// 보안: API 키 출력·유료 모델·자동 결제·로컬 모델·추가 파이프라인 금지.
// [400 원인 분류] 문맥 초과·안전정책은 위에서 따로 처리한다. 나머지를 고칠 위치가 다른 유형으로 나눈다.
export function classifyHttp400(detail=''){
  const d=String(detail||'');
  if(/model[^.]{0,40}(not found|does not exist|decommission|not available|unknown|invalid)|no endpoints found|is not a valid model/i.test(d))return'MODEL_UNAVAILABLE';
  if(/unsupported|not supported|unknown (parameter|field|argument)|unrecognized|additional properties|property .{1,40} is not allowed|invalid[_ ]?(parameter|argument|value)/i.test(d))return'UNSUPPORTED_PARAMETER';
  if(/json|schema|response[_ ]?format|mime/i.test(d))return'RESPONSE_FORMAT';
  if(/role|messages?|content|empty|must (be|have)|required/i.test(d))return'INVALID_REQUEST_SHAPE';
  return d?'OTHER':'NO_DETAIL';
}

export const GEMINI_FREE_MODELS=Object.freeze(['gemini-3.8-flash','gemini-3.5-flash-lite']);
export const VERIFIED_FREE_FALLBACK_MODELS=Object.freeze({
  GROQ:'openai/gpt-oss-20b',
  OPENROUTER:'google/gemma-4-31b-it:free'
});
const cooldownUntil=new Map();
const groqQuotaByModel=new Map();
// [실행 간 쿨다운 공유] 메모리 쿨다운은 새 GitHub 실행에서 사라져 한도가 끝난 모델을 다시 두드렸다.
// VIBE2_FREE_AI_COOLDOWN_FILE(기존 actions/cache로 실행 간 복원)에 모델별 복구 시각을 남긴다.
// 병합 규칙: 같은 모델은 더 늦은 시각만 남겨 동시 워커가 서로의 기록을 지워도 한도가 초기화되지 않는다.
// 지난 시각은 저장할 때 정리한다. 키·요청 내용은 저장하지 않는다(모델 이름·시각·근거만).
function cooldownFile(){return String(process.env.VIBE2_FREE_AI_COOLDOWN_FILE??'').trim();}
function readSharedCooldowns(){
  const file=cooldownFile();
  if(!file)return{};
  try{
    const parsed=JSON.parse(fs.readFileSync(file,'utf8'));
    return parsed&&typeof parsed==='object'&&parsed.slots&&typeof parsed.slots==='object'?parsed.slots:{};
  }catch{return{};}
}
function loadSharedCooldowns(now=Date.now()){
  for(const [slot,row] of Object.entries(readSharedCooldowns())){
    const until=Number(row?.until);
    if(Number.isFinite(until)&&until>now)cooldownUntil.set(slot,Math.max(cooldownUntil.get(slot)||0,until));
  }
}
function setCooldown(slot,until,basis='observed'){
  const next=Math.max(cooldownUntil.get(slot)||0,Number(until)||0);
  cooldownUntil.set(slot,next);
  const file=cooldownFile();
  if(!file)return;
  try{
    const now=Date.now();
    const slots={};
    for(const [key,row] of Object.entries(readSharedCooldowns()))
      if(Number(row?.until)>now)slots[key]=row;
    if(!slots[slot]||Number(slots[slot].until)<next)
      slots[slot]={until:next,untilIso:new Date(next).toISOString(),basis,recordedAt:new Date(now).toISOString()};
    fs.mkdirSync(path.dirname(file),{recursive:true});
    const tmp=file+'.'+process.pid+'.tmp';
    fs.writeFileSync(tmp,JSON.stringify({version:1,slots},null,1));
    fs.renameSync(tmp,file);
  }catch{/* 공유 기록 실패가 요청 자체를 막지 않는다 */}
}
export function sharedCooldownSnapshot(){return readSharedCooldowns();}
let nextSlot=0;
const clean=value=>String(value??'').trim();
function infrastructureFailure(message,retryAt=0){
  const error=new Error(message);
  error.vibe2InfrastructureFailure=true;
  error.vibe2GenerationFailureClass='EXTERNAL_AI_UNAVAILABLE';
  if(Number.isFinite(retryAt)&&retryAt>Date.now()){
    error.retryAfterMs=Math.max(1000,retryAt-Date.now());
    error.nextRetryAt=new Date(retryAt).toISOString();
  }
  return error;
}
// [무료 충원] Gemini 프로젝트·모델 일간 한도는 미국 태평양 자정에 초기화된다.
// 매 24시간 고정 대기하면 실제 초기화 후에도 미사용 무료 용량이 방치된다.
export function geminiPacificDailyRefillDelayMs(now=Date.now()){
  const localDay=ms=>{
    const parts=new Intl.DateTimeFormat('en-US',{
      timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit'
    }).formatToParts(new Date(ms));
    const fields=Object.fromEntries(parts.filter(p=>p.type!=='literal')
      .map(p=>[p.type,p.value]));
    return fields.year+'-'+fields.month+'-'+fields.day;
  };
  const current=localDay(now),hour=Math.floor(now/3600000)*3600000;
  for(let i=1;i<=49;i++){
    const candidate=hour+i*3600000;
    if(localDay(candidate)!==current)return Math.max(1000,candidate-now);
  }
  return 86400000;
}
export function retryDelayMs(response,status,body=null,{provider='GENERIC',now=Date.now()}={}){
  const value=clean(response?.headers?.get?.('retry-after'));
  const seconds=Number(value);
  let delay=Number.isFinite(seconds)&&seconds>0?seconds*1000:Date.parse(value)-Date.now();
  if(!Number.isFinite(delay)||delay<=0){
    const providerDelay=clean(body?.error?.details?.find?.(row=>row?.['@type']?.includes('RetryInfo'))?.retryDelay);
    if(/^\d+(?:\.\d+)?s$/.test(providerDelay))delay=Number(providerDelay.slice(0,-1))*1000;
  }
  if(!Number.isFinite(delay)||delay<=0){
    const detail=clean(body?.error?.message);
    const dailyQuota=/GenerateRequestsPerDayPerProjectPerModel-FreeTier|requests per day|daily quota/i.test(detail);
    // Daily free-tier exhaustion must not hot-loop during the next GitHub Actions wave.
    delay=status===429&&dailyQuota&&provider==='GEMINI'
      ?geminiPacificDailyRefillDelayMs(now)
      :status===404||(status===429&&dailyQuota)?86400000:status===429?60000:15000;
  }
  return Math.min(86400000,Math.max(1000,delay));
}
// [무료 그록 회계] 공식 응답 헤더의 모델별 일간 요청·분당 토큰을 분리하여 기록.
// 응답 헤더가 없거나 모순되면 잔량을 만들지 않는다. 계정 전체 제공업체 합산치로 표시하지 않는다.
export function groqQuotaFromHeaders(response,now=Date.now()){
  const get=name=>clean(response?.headers?.get?.(name));
  const limit=get('x-ratelimit-limit-requests'), remaining=get('x-ratelimit-remaining-requests');
  const tokenLimit=get('x-ratelimit-limit-tokens'), tokenRemaining=get('x-ratelimit-remaining-tokens');
  const integer=value=>/^\d+$/.test(value)?Number(value):null;
  const values=[limit,remaining,tokenLimit,tokenRemaining].map(integer);
  if(values.some(value=>!Number.isSafeInteger(value)||value<0))return null;
  const [requestsPerDayLimit,requestsPerDayRemaining,tokensPerMinuteLimit,tokensPerMinuteRemaining]=values;
  if(requestsPerDayRemaining>requestsPerDayLimit||tokensPerMinuteRemaining>tokensPerMinuteLimit)
    return null;
  const resetAt=value=>{
    const parsed=/^(?:(\d+(?:\.\d+)?)h)?(?:(\d+(?:\.\d+)?)m)?(?:(\d+(?:\.\d+)?)s)?$/.exec(value);
    if(!parsed||!parsed[0])return null;
    const duration=(Number(parsed[1]||0)*3600+Number(parsed[2]||0)*60+Number(parsed[3]||0))*1000;
    return duration>0&&duration<=86400000?new Date(now+Math.ceil(duration)).toISOString():null;
  };
  return {
    scope:'GROQ_MODEL_RATE_LIMIT_HEADERS',requestsPerDayLimit,requestsPerDayRemaining,
    tokensPerMinuteLimit,tokensPerMinuteRemaining,
    requestsResetAt:resetAt(get('x-ratelimit-reset-requests')),
    tokensResetAt:resetAt(get('x-ratelimit-reset-tokens')),
    observedAt:new Date(now).toISOString(),accountWideBalanceVerified:false
  };
}
export function latestGroqModelQuota(model){
  return groqQuotaByModel.get('GROQ:'+clean(model))||null;
}
export function verifiedFreeGeminiModels(env=process.env){
  const models=[clean(env.VIBE2_GEMINI_MODEL||GEMINI_FREE_MODELS[0]),clean(env.VIBE2_GEMINI_BACKUP_MODEL||GEMINI_FREE_MODELS[1])];
  if(models[0]!==GEMINI_FREE_MODELS[0]||models[1]!==GEMINI_FREE_MODELS[1])
    throw new Error('GEMINI_FREE_MODEL_PAIR_INVALID');
  return models;
}
// [Vibe5.9 전문 배정] 기존 무료 모델 고정 목록만 사용한다. 순위는 검증 전 가설이며 능력 인증이 아니다.
// 기획/코드/그래픽/품질/경제/음향은 같은 모델이라도 서로 다른 우선순위를 갖는다.
const VIBE59_EXPERT_PRIORS=Object.freeze({
  PLANNING:['GEMINI_LITE','GEMINI_FLASH','OPENROUTER','GROQ'],
  DEVELOPMENT:['GROQ','GEMINI_FLASH','OPENROUTER','GEMINI_LITE'],
  GRAPHICS:['OPENROUTER','GEMINI_FLASH','GEMINI_LITE','GROQ'],
  NPC:['GEMINI_FLASH','OPENROUTER','GEMINI_LITE','GROQ'],
  WORLD:['GEMINI_FLASH','OPENROUTER','GEMINI_LITE','GROQ'],
  UI:['OPENROUTER','GEMINI_FLASH','GEMINI_LITE','GROQ'],
  MOTION:['GEMINI_FLASH','OPENROUTER','GROQ','GEMINI_LITE'],
  QA:['GROQ','GEMINI_FLASH','OPENROUTER','GEMINI_LITE'],
  BALANCE:['GEMINI_FLASH','GROQ','GEMINI_LITE','OPENROUTER'],
  AUDIO:['GEMINI_FLASH','OPENROUTER','GEMINI_LITE','GROQ']
});
export function selectVibe59FreeExperts({
  department='DEVELOPMENT',taskText='',responsibleFiles=[],verifiedOutcomes=[],
  freeCapacity={},env=process.env,includeUnconfigured=false,now=Date.now()
}={}){
  const requested=clean(department).toUpperCase().replaceAll('-','_');
  const goal=clean(taskText).slice(0,1600).toLowerCase();
  const files=(Array.isArray(responsibleFiles)?responsibleFiles.slice(0,16).join(' '):'').toLowerCase();
  // [Vibe5.9 분야 분류] 사용자 목표가 1차 근거, 책임 파일 경로는 2차 근거다.
  // 'interface' 속 'face', 'ownership' 속 'ship', 'runner' 속 'run'처럼 부분 문자열을 오인하지 않는다.
  const visualGoal=/머리|얼굴|의상|외형|옷|표정|피부|색상|질감|텍스처|재질|조명|그래픽|디자인|아트|초상|이미지|아이콘|메뉴|버튼|화면|애니메이션|움직임|동작|모션|시각|풍경|꾸미|멋있|외관|\b(?:face|hair|outfit|clothing|portrait|visual|graphics|texture|material|lighting|render|animation|motion|hud|ui|menu|layout|skin)\b/i.test(goal);
  const technicalGoal=/로직|규칙|구현|버그|오류|동기화|저장|전투|공격|피격|데미지|경로탐색|패스파인딩|인벤토리|데이터베이스|서버|코드|함수|성능|스크립트|\b(?:bug|logic|save|sync|combat|damage|pathfinding|inventory|server|script|code|function|physics|network|database)\b/i.test(goal);
  const graphicFiles=/\b(?:gui|ui|hud|menu|portrait|texture|material|lighting|animation|motion|visual)\b|\.client\.(?:lua|luau)\b|pose\.luau|townmood/i.test(files);
  const source=goal+' '+files;
  // 작업 내용이 코드·규칙 수정임을 명시한 경우 단순 NPC/선박 파일명만으로 그래픽에 보내지 않는다.
  const dept=requested!=='AUTO'?requested:
    visualGoal?'GRAPHICS'
      :technicalGoal?'DEVELOPMENT'
      :/음향|효과음|음악|오디오|사운드|\b(?:sound|audio|music)\b/.test(goal)?'AUDIO'
      :/회귀|검증|품질|테스트|\b(?:qa|regression|test)\b/.test(goal)?'QA'
      :/밸런스|보상|경제|난이도|\b(?:balance|economy|reward)\b/.test(goal)?'BALANCE'
      :/기획|설계|계획|\bplanning\b/.test(goal)?'PLANNING'
      :graphicFiles?'GRAPHICS':'DEVELOPMENT';
  const graphic=dept==='GRAPHICS';
  const motion=/애니메이션|동작|움직임|모션|\b(?:motion|animation|walk|run|running|pose)\b/i;
  const npc=/주민|캐릭터|얼굴|머리|의상|외형|옷|표정|피부|\b(?:npc|head|face|hair|outfit|clothing|portrait)\b/i;
  const ui=/버튼|화면|메뉴|아이콘|\b(?:hud|interface|menu|ui|gui|font|layout)\b/i;
  const world=/항구|마을|선박|건물|배경|풍경|\b(?:port|ship|harbor|landscape|town|world|scenery)\b/i;
  const role=graphic
    ?motion.test(goal)?'MOTION'
      :npc.test(goal)?'NPC'
      :ui.test(goal)?'UI'
      :world.test(goal)?'WORLD'
      :motion.test(files)?'MOTION'
      :npc.test(files)?'NPC'
      :ui.test(files)?'UI'
      :world.test(files)?'WORLD':'GRAPHICS'
    :Object.hasOwn(VIBE59_EXPERT_PRIORS,dept)?dept:'DEVELOPMENT';
  const ids=VIBE59_EXPERT_PRIORS[role];
  const geminiModels=verifiedFreeGeminiModels(env);
  const choices=[
    {id:'GEMINI_FLASH',provider:'GEMINI',model:geminiModels[0],available:!!clean(env.GEMINI_API_KEY)},
    {id:'GEMINI_LITE',provider:'GEMINI',model:geminiModels[1],available:!!clean(env.GEMINI_API_KEY)},
    // [무료 자격] 키 보유 ≠ 무료 요금제 확인. 오너 결정(2026-11-22): VIBE2_GROQ_FREE_PLAN_VERIFIED=YES 일 때만 배정.
    {id:'GROQ',provider:'GROQ',model:VERIFIED_FREE_FALLBACK_MODELS.GROQ,
      available:clean(env.VIBE2_EXTERNAL_FREE_ROTATION)==='YES'&&
        !!clean(env.GROQ_API_KEY)&&clean(env.VIBE2_GROQ_FREE_PLAN_VERIFIED)==='YES'},
    {id:'OPENROUTER',provider:'OPENROUTER',model:VERIFIED_FREE_FALLBACK_MODELS.OPENROUTER,
      available:clean(env.VIBE2_EXTERNAL_FREE_ROTATION)==='YES'&&!!clean(env.OPENROUTER_API_KEY)}
  ];
  const scored=choices.map(item=>{
    const preference=ids.indexOf(item.id);
    const skill=Math.max(.4,1-preference*.18);
    // 독립 QA 검증 + 같은 모델·분야 + 원본 리비전 증거가 없는 피드백은 점수에 반영하지 않는다.
    const observed=(Array.isArray(verifiedOutcomes)?verifiedOutcomes:[]).slice(-100)
      .filter(row=>row?.verified===true&&row?.independentQa==='PASS'&&
        clean(row.sourceRevision)&&row.provider===item.provider&&row.model===item.model&&
        clean(row.specialistDomain||row.role).toUpperCase()===role&&
        ['SUCCESS','FAILURE'].includes(row.outcome));
    const success=observed.filter(row=>row.outcome==='SUCCESS').length;
    const quality=observed.length?(success+2)/(observed.length+4):.5;
    const capacity=freeCapacity?.[item.provider+':'+item.model];
    const confirmed=capacity?.verified===true&&
      Number.isInteger(capacity.remaining)&&Number.isInteger(capacity.limit)&&
      capacity.limit>0&&capacity.remaining>=0&&capacity.remaining<=capacity.limit&&
      now-Date.parse(capacity.observedAt)<10*60*1000&&now>=Date.parse(capacity.observedAt);
    const remaining=confirmed?capacity.remaining/capacity.limit:.5;
    const cooling=(cooldownUntil.get(item.provider==='GEMINI'?item.model:
      item.provider+':'+item.model)||0)>now;
    return {...item,domain:role,verifiedSamples:observed.length,
      score:Math.round(100*(.4*quality+.25*skill+.15*remaining+
        .1*(observed.length?quality:.5)+.1*(observed.length?quality:.5))),
      eligible:item.available&&!cooling&&(!confirmed||capacity.remaining>0),
      evidence:observed.length?'INDEPENDENT_QA':'ROLE_PRIOR_UNVERIFIED'};
  }).sort((a,b)=>b.score-a.score||ids.indexOf(a.id)-ids.indexOf(b.id));
  return Object.freeze({version:'5.9',domain:role,source:'EXISTING_FREE_MODEL_ROTATION',
    expertCandidates:scored.filter(x=>includeUnconfigured||x.eligible)
      .map(({id,provider,model,score,available,eligible,verifiedSamples,evidence})=>
        ({id,provider,model,score,available,eligible,verifiedSamples,evidence})),
    sourceWrite:false,externalModelCalled:false,independentQaRequired:true});
}
export async function requestGeminiFreePair({
  apiKey,contents,maxOutputTokens=3072,temperature=.08,timeoutMs=240000,
  responseMimeType=null,fetchImpl=globalThis.fetch,geminiRetryAt=null,preferredRole='',
  specialistDepartment='',specialistTask='',specialistFiles=[],verifiedOutcomes=[]
}={}){
  // 다른 실행·워커가 남긴 모델별 복구 시각을 먼저 읽어, 쿨다운 중인 모델은 호출하지 않는다.
  loadSharedCooldowns();
  const models=verifiedFreeGeminiModels();
  const knownRetryAt=Date.parse(clean(geminiRetryAt));
  if(Number.isFinite(knownRetryAt)&&knownRetryAt>Date.now())
    for(const model of models)setCooldown(model,knownRetryAt,'official');
  const role=clean(preferredRole).toUpperCase();
  if(role&&!['TRIAGE','CODE_REPAIR','VERIFY'].includes(role))
    throw infrastructureFailure('VIBE2_FREE_AI_ROLE_INVALID');
  const first=role==='TRIAGE'?1:role?0:nextSlot++%models.length;
  // [무료 전문팀 자동 교대] Gemini 키가 비어도 명시 승인된 무료 대체 제공자는 사용한다.
  // Gemini 키가 없는 상태에서 Gemini 엔드포인트를 호출하거나 유료 경로로 확장하지 않는다.
  const geminiRoutes=clean(apiKey)?Array.from({length:models.length},(_,offset)=>({
    provider:'GEMINI',model:models[(first+offset)%models.length],key:clean(apiKey)
  })):[];
  // 기존 승인된 무료 공급자만 채택한다. 인증키 보유와 무료 요금제 증거는 구분한다.
  const externalRotation=clean(process.env.VIBE2_EXTERNAL_FREE_ROTATION)==='YES';
  const extras=externalRotation?[
    // 무료 요금제 확인 플래그가 YES가 아니면 Groq는 호출 경로에 넣지 않는다(키만으로 호출 금지).
    ...(clean(process.env.GROQ_API_KEY)&&clean(process.env.VIBE2_GROQ_FREE_PLAN_VERIFIED)==='YES'
      ?[{provider:'GROQ',model:VERIFIED_FREE_FALLBACK_MODELS.GROQ,key:clean(process.env.GROQ_API_KEY),
         endpoint:'https://api.groq.com/openai/v1/chat/completions'}]:[]),
    ...(clean(process.env.OPENROUTER_API_KEY)
      ?[{provider:'OPENROUTER',model:VERIFIED_FREE_FALLBACK_MODELS.OPENROUTER,key:clean(process.env.OPENROUTER_API_KEY),
         endpoint:'https://openrouter.ai/api/v1/chat/completions'}]:[])
  ]:[];
  if(!geminiRoutes.length&&!extras.length)
    throw infrastructureFailure('GEMINI_API_KEY_MISSING_NO_LOCAL_FALLBACK');
  const normalRoutes=[...geminiRoutes,...extras];
  const observedGroq=groqQuotaByModel.get('GROQ:'+VERIFIED_FREE_FALLBACK_MODELS.GROQ);
  const capacity=observedGroq?{['GROQ:'+VERIFIED_FREE_FALLBACK_MODELS.GROQ]:{
    verified:true,remaining:observedGroq.requestsPerDayRemaining,
    limit:observedGroq.requestsPerDayLimit,observedAt:observedGroq.observedAt}}:{};
  const expert=clean(specialistDepartment)?selectVibe59FreeExperts({
    department:specialistDepartment,taskText:specialistTask,
    responsibleFiles:specialistFiles,verifiedOutcomes,freeCapacity:capacity,
    env:{...process.env,GEMINI_API_KEY:clean(apiKey)}
  }):null;
  // Vibe5.9의 분야별 전문가 우선순위를 기존 요청 함수의 실제 호출 순서에 적용.
  // 신규 큐·워커·API 공급자 추가 없이 기존 엔드포인트/출력 계약을 그대로 사용한다.
  // [차단] 검증된 잔량 0·쿨다운·무료 요금제 미확인 슬롯은 끝에 다시 붙이지 않는다.
  const routes=expert?expert.expertCandidates.flatMap(item=>normalRoutes.filter(route=>
    route.provider===item.provider&&route.model===item.model)):normalRoutes;
  const failures=[];
  for(const route of routes){
    const model=route.model,provider=route.provider;
    const slot=provider==='GEMINI'?model:provider+':'+model;
    if((cooldownUntil.get(slot)||0)>Date.now()){
      failures.push(slot+':COOLDOWN');continue;
    }
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),Math.max(10000,Number(timeoutMs)||240000));
    try{
      let endpoint,headers,body;
      if(provider==='GEMINI'){
        endpoint='https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(model)+':generateContent';
        const generationConfig={
          temperature:Math.max(0,Math.min(.6,Number(temperature)||0)),
          maxOutputTokens:Math.max(512,Math.min(16384,Number(maxOutputTokens)||3072))
        };
        if(responseMimeType)generationConfig.responseMimeType=responseMimeType;
        headers={'content-type':'application/json','x-goog-api-key':route.key};
        body={contents,generationConfig};
      }else{
        const messages=(Array.isArray(contents)?contents:[]).map(row=>({
          role:row?.role==='model'?'assistant':'user',
          content:(row?.parts||[]).filter(part=>typeof part?.text==='string').map(part=>part.text).join('\n')
        })).filter(row=>row.content);
        if(!messages.length)throw infrastructureFailure('EXTERNAL_FREE_EMPTY_PROMPT_BLOCKED');
        body={model,messages,stream:false,
          temperature:Math.max(0,Math.min(.6,Number(temperature)||0)),
          max_tokens:Math.max(512,Math.min(16384,Number(maxOutputTokens)||3072))};
        if(provider==='GROQ'){
          body.max_completion_tokens=body.max_tokens;
          delete body.max_tokens;
          body.service_tier='on_demand';
        }
        endpoint=route.endpoint;
        headers={'content-type':'application/json','authorization':'Bearer '+route.key};
      }
      const response=await fetchImpl(endpoint,{
        method:'POST',signal:controller.signal,headers,body:JSON.stringify(body)
      });
      const groqQuota=provider==='GROQ'?groqQuotaFromHeaders(response):null;
      if(groqQuota){
        groqQuotaByModel.set(slot,groqQuota);
        const exhausted=[
          groqQuota.requestsPerDayRemaining===0?Date.parse(groqQuota.requestsResetAt):0,
          groqQuota.tokensPerMinuteRemaining===0?Date.parse(groqQuota.tokensResetAt):0
        ].filter(value=>Number.isFinite(value)&&value>Date.now());
        if(exhausted.length)setCooldown(slot,Math.max(...exhausted),'official');
      }
      if(!response.ok){
        const status=response.status;
        // [모델별 인증 실패] 잘못된 키 한 개 때문에 다른 무료 모델까지 중단하지 않는다.
        // 결제 요구 및 안전/권한 차단은 기존대로 전체 요청을 중단한다.
        if(status===401){
          setCooldown(slot,Date.now()+21600000);
          failures.push(slot+':HTTP_401');
          console.log('VIBE2_EXTERNAL_FREE_ROTATE='+slot+':HTTP_401');
          continue;
        }
        if([402,403].includes(status))
          throw infrastructureFailure(provider==='GEMINI'
            ?'GEMINI_AUTH_OR_BILLING_BLOCKED_NO_LOCAL_FALLBACK:'+status
            :provider+'_AUTH_OR_BILLING_BLOCKED_NO_PAID_FALLBACK:'+status);
        if(provider==='GEMINI'&&[400,404,429,500,502,503,504].includes(status)){
          let errorBody=null;
          if([400,429].includes(status)&&typeof response.json==='function')
            try{errorBody=await response.json();}catch{/* 상태 코드가 우선 */}
          const detail=[errorBody?.error?.status,errorBody?.error?.message]
            .map(clean).join(' ');
          if(status===400&&/content[-_ ]?(policy|filter)|safety|moderation|disallowed|policy[-_ ]?violation|prohibited|prompt[-_ ]?blocked/i.test(detail))
            throw infrastructureFailure('GEMINI_CONTENT_POLICY_BLOCKED_NO_FALLBACK');
          const contextError=status===400&&/context[_ -]?length|maximum context|too many tokens|prompt[^.]{0,80}too (?:long|large)|input[^.]{0,80}token[^.]{0,80}(?:limit|exceed)/i.test(detail);
          if(!contextError){
            const delay=status===400
              ?Math.max(1800000,retryDelayMs(response,status,errorBody,{provider:'GEMINI'}))
              :retryDelayMs(response,status,errorBody,{provider:'GEMINI'});
            setCooldown(slot,Date.now()+delay);
          }
          if(contextError)console.log('VIBE2_EXTERNAL_FREE_REQUEST_CONTEXT_REJECTED='+slot);
          if(status===400&&!contextError){
            const kind=classifyHttp400(detail);
            // 실패 문자열 형식(slot:HTTP_400)은 큐·조직 파서가 쓰므로 그대로 두고, 원인은 로그로 남긴다.
            failures.push(slot+':HTTP_400');
            console.log('VIBE2_EXTERNAL_FREE_HTTP400='+slot+':'+kind+':'+detail.replace(/\s+/g,' ').slice(0,180));
            continue;
          }
          failures.push(slot+':HTTP_'+status);
          console.log('VIBE2_GEMINI_FREE_ROTATE='+model+':HTTP_'+status);
          continue;
        }
        if(provider!=='GEMINI'&&[400,404,429,500,502,503,504].includes(status)){
          let errorBody=null;
          if([400,429].includes(status)&&typeof response.json==='function')
            try{errorBody=await response.json();}catch{/* status is authoritative */}
          const detail=[errorBody?.error?.code,errorBody?.error?.type,errorBody?.error?.message]
            .map(clean).join(' ');
          if(status===400&&/content[-_ ]?(policy|filter)|safety|moderation|disallowed|policy[-_ ]?violation|prohibited|prompt[-_ ]?blocked/i.test(detail))
            throw infrastructureFailure(provider+'_CONTENT_POLICY_BLOCKED_NO_FALLBACK');
          const contextError=status===400&&/context[_ -]?length|maximum context|too many tokens|prompt[^.]{0,80}too (?:long|large)|input[^.]{0,80}token[^.]{0,80}(?:limit|exceed)/i.test(detail);
          if(!contextError){
            let delay=status===400?Math.max(1800000,retryDelayMs(response,status,errorBody))
              :retryDelayMs(response,status,errorBody);
            if(status===429&&groqQuota){
              const requestReset=groqQuota.requestsPerDayRemaining===0
                ?Date.parse(groqQuota.requestsResetAt):0;
              const tokenReset=groqQuota.tokensPerMinuteRemaining===0
                ?Date.parse(groqQuota.tokensResetAt):0;
              delay=Math.max(delay,Number.isFinite(requestReset)?requestReset-Date.now():0,
                Number.isFinite(tokenReset)?tokenReset-Date.now():0,0);
            }
            setCooldown(slot,Date.now()+delay);
          }
          if(contextError)console.log('VIBE2_EXTERNAL_FREE_REQUEST_CONTEXT_REJECTED='+slot);
          // [400 원인 기록] 실행 44956033693: OpenRouter·Groq 400이 원인 없이 '다음 모델로'만 기록됐다.
          // 공급자 응답의 오류 코드·유형·문구로 원인을 나눠 남겨, 요청 생성 함수를 고칠 근거로 쓴다.
          if(status===400&&!contextError){
            const kind=classifyHttp400(detail);
            // 실패 문자열 형식(slot:HTTP_400)은 큐·조직 파서가 쓰므로 그대로 두고, 원인은 로그로 남긴다.
            failures.push(slot+':HTTP_400');
            console.log('VIBE2_EXTERNAL_FREE_HTTP400='+slot+':'+kind+':'+detail.replace(/\s+/g,' ').slice(0,180));
            continue;
          }
          failures.push(slot+':HTTP_'+status);
          console.log('VIBE2_EXTERNAL_FREE_ROTATE='+slot+':HTTP_'+status);
          continue;
        }
        throw infrastructureFailure(provider==='GEMINI'
          ?'GEMINI_HTTP_ERROR_NO_LOCAL_FALLBACK:'+status
          :provider+'_HTTP_ERROR_NO_PAID_FALLBACK:'+status);
      }
      const payload=await response.json();
      if(provider!=='GEMINI'&&Number(payload?.usage?.cost||0)>0)
        throw infrastructureFailure(provider+'_NONZERO_COST_RESPONSE_BLOCKED');
      const content=provider==='GEMINI'
        ?(payload.candidates?.[0]?.content?.parts||[]).filter(part=>
          typeof part?.text==='string').map(part=>part.text).join('')
        :payload?.choices?.[0]?.message?.content;
      const textValue=typeof content==='string'?content:
        Array.isArray(content)?content.filter(item=>typeof item?.text==='string')
          .map(item=>item.text).join(''):'';
      if(!textValue.trim()){
        setCooldown(slot,Date.now()+15000);
        failures.push(slot+':EMPTY_OUTPUT');
        if(provider==='GEMINI')console.log('VIBE2_GEMINI_FREE_ROTATE='+model+':EMPTY_OUTPUT');
        continue;
      }
      console.log('VIBE2_EXTERNAL_AI_MODEL_USED='+(provider==='GEMINI'?model:slot));
      if(expert)console.log('VIBE59_FREE_EXPERT_ASSIGNED='+expert.domain+':'+slot);
      if(groqQuota)console.log('VIBE2_FREE_AI_GROQ_RPD_REMAINING='+
        groqQuota.requestsPerDayRemaining+';TPM_REMAINING='+groqQuota.tokensPerMinuteRemaining);
      return {text:textValue,model,provider,...(groqQuota?{freeQuota:groqQuota}:{})};
    }catch(error){
      if(error?.name==='AbortError'||error instanceof TypeError||error instanceof SyntaxError){
        setCooldown(slot,Date.now()+15000);
        failures.push(slot+':TRANSPORT_OR_TIMEOUT');
        console.log((provider==='GEMINI'?'VIBE2_GEMINI_FREE_ROTATE=':
          'VIBE2_EXTERNAL_FREE_ROTATE=')+slot+':TRANSPORT_OR_TIMEOUT');
        continue;
      }
      throw error;
    }finally{clearTimeout(timeout);}
  }
  const nextRetryAt=Math.min(...routes.map(route=>cooldownUntil.get(
    route.provider==='GEMINI'?route.model:route.provider+':'+route.model)||Infinity));
  const retryAt=Number.isFinite(nextRetryAt)?nextRetryAt:0;
  const suffix=retryAt?':NEXT_RETRY_AT='+new Date(retryAt).toISOString():'';
  throw infrastructureFailure('GEMINI_FREE_TWO_MODEL_POOL_UNAVAILABLE_NO_LOCAL_FALLBACK:'+
    failures.join(',')+suffix,retryAt);
}
