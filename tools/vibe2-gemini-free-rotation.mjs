// 파일명: tools/vibe2-gemini-free-rotation.mjs
// 메인: 기존 Gemini 소스·학습 공용 API 요청 안에서만 무료 공급자 대체 순환.
// 보안: API 키 출력·유료 모델·자동 결제·로컬 모델·추가 파이프라인 금지.
export const GEMINI_FREE_MODELS=Object.freeze(['gemini-3.8-flash','gemini-3.5-flash-lite']);
export const VERIFIED_FREE_FALLBACK_MODELS=Object.freeze({
  GROQ:'openai/gpt-oss-20b',
  OPENROUTER:'qwen/qwen3.8-27b:free'
});
const cooldownUntil=new Map();
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
export function retryDelayMs(response,status,body=null){
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
    delay=status===404||(status===429&&dailyQuota)?86400000:status===429?60000:15000;
  }
  return Math.min(86400000,Math.max(1000,delay));
}
export function verifiedFreeGeminiModels(env=process.env){
  const models=[clean(env.VIBE2_GEMINI_MODEL||GEMINI_FREE_MODELS[0]),clean(env.VIBE2_GEMINI_BACKUP_MODEL||GEMINI_FREE_MODELS[1])];
  if(models[0]!==GEMINI_FREE_MODELS[0]||models[1]!==GEMINI_FREE_MODELS[1])
    throw new Error('GEMINI_FREE_MODEL_PAIR_INVALID');
  return models;
}
export async function requestGeminiFreePair({
  apiKey,contents,maxOutputTokens=3072,temperature=.08,timeoutMs=240000,responseMimeType=null,fetchImpl=globalThis.fetch
}={}){
  if(!clean(apiKey))throw infrastructureFailure('GEMINI_API_KEY_MISSING_NO_LOCAL_FALLBACK');
  const models=verifiedFreeGeminiModels();
  const first=nextSlot++%models.length,failures=[];
  for(let offset=0;offset<models.length;offset++){
    const model=models[(first+offset)%models.length];
    const cooldown=cooldownUntil.get(model)||0;
    if(cooldown>Date.now()){failures.push(model+':COOLDOWN');continue;}
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),Math.max(10000,Number(timeoutMs)||240000));
    try{
      const generationConfig={
        temperature:Math.max(0,Math.min(.6,Number(temperature)||0)),
        maxOutputTokens:Math.max(512,Math.min(16384,Number(maxOutputTokens)||3072))
      };
      if(responseMimeType)generationConfig.responseMimeType=responseMimeType;
      const response=await fetchImpl(
        'https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(model)+':generateContent',
        {method:'POST',signal:controller.signal,headers:{'content-type':'application/json','x-goog-api-key':apiKey},
          body:JSON.stringify({contents,generationConfig})}
      );
      if(!response.ok){
        const status=response.status;
        // Auth/billing/project access errors must never trigger key switching or paid routing.
        if([401,402,403].includes(status))throw infrastructureFailure('GEMINI_AUTH_OR_BILLING_BLOCKED_NO_LOCAL_FALLBACK:'+status);
        if([404,429,500,502,503,504].includes(status)){
          let errorBody=null;
          if(status===429&&typeof response.json==='function'){
            try{errorBody=await response.json();}catch{/* Keep the HTTP status authoritative. */}
          }
          cooldownUntil.set(model,Date.now()+retryDelayMs(response,status,errorBody));
          failures.push(model+':HTTP_'+status);
          console.log('VIBE2_GEMINI_FREE_ROTATE='+model+':HTTP_'+status);
          continue;
        }
        throw infrastructureFailure('GEMINI_HTTP_ERROR_NO_LOCAL_FALLBACK:'+status);
      }
      const payload=await response.json();
      const text=(payload.candidates?.[0]?.content?.parts||[])
        .filter(part=>typeof part?.text==='string').map(part=>part.text).join('');
      if(!text.trim()){
        cooldownUntil.set(model,Date.now()+15000);
        failures.push(model+':EMPTY_OUTPUT');
        console.log('VIBE2_GEMINI_FREE_ROTATE='+model+':EMPTY_OUTPUT');
        continue;
      }
      console.log('VIBE2_EXTERNAL_AI_MODEL_USED='+model);
      return{text,model};
    }catch(error){
      // A cancelled/failed transport may rotate once; an authorization or content failure may not.
      if(error?.name==='AbortError'||error instanceof TypeError||error instanceof SyntaxError){
        cooldownUntil.set(model,Date.now()+15000);
        failures.push(model+':TRANSPORT_OR_TIMEOUT');
        console.log('VIBE2_GEMINI_FREE_ROTATE='+model+':TRANSPORT_OR_TIMEOUT');
        continue;
      }
      throw error;
    }finally{clearTimeout(timeout);}
  }

  // [메인] Gemini 2개 무료 슬롯이 막힐 때 기존 요청 안에서만 승인된 무료 API 사용.
  // Groq는 키 보유만으로 무료 요금제를 증명하지 못하므로 명시적 요금제 확인이 필수.
  // OpenRouter는 고정 :free 모델만 허용하며 유료 자동 라우터를 사용하지 않는다.
  const externalRotation=clean(process.env.VIBE2_EXTERNAL_FREE_ROTATION)==='YES';
  const extraRoutes=externalRotation?[
    ...(clean(process.env.GROQ_API_KEY)&&clean(process.env.VIBE2_GROQ_FREE_PLAN_VERIFIED)==='YES'
      ?[{provider:'GROQ',model:VERIFIED_FREE_FALLBACK_MODELS.GROQ,key:clean(process.env.GROQ_API_KEY),
         endpoint:'https://api.groq.com/openai/v1/chat/completions'}]:[]),
    ...(clean(process.env.OPENROUTER_API_KEY)
      ?[{provider:'OPENROUTER',model:VERIFIED_FREE_FALLBACK_MODELS.OPENROUTER,key:clean(process.env.OPENROUTER_API_KEY),
         endpoint:'https://openrouter.ai/api/v1/chat/completions'}]:[])
  ]:[];
  for(const route of extraRoutes){
    const slot=route.provider+':'+route.model;
    if((cooldownUntil.get(slot)||0)>Date.now()){failures.push(slot+':COOLDOWN');continue;}
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),Math.max(10000,Number(timeoutMs)||240000));
    try{
      const messages=(Array.isArray(contents)?contents:[]).map(row=>({
        role:row?.role==='model'?'assistant':'user',
        content:(row?.parts||[]).filter(part=>typeof part?.text==='string').map(part=>part.text).join('\n')
      })).filter(row=>row.content);
      if(!messages.length)throw infrastructureFailure('EXTERNAL_FREE_EMPTY_PROMPT_BLOCKED');
      const body={
        model:route.model,messages,stream:false,
        temperature:Math.max(0,Math.min(.6,Number(temperature)||0)),
        max_tokens:Math.max(512,Math.min(16384,Number(maxOutputTokens)||3072))
      };
      if(route.provider==='GROQ'){
        // Groq GPT-OSS 명세의 completion 토큰 필드를 직접 사용한다.
        body.max_completion_tokens=body.max_tokens;
        delete body.max_tokens;
        body.service_tier='on_demand';
      }
      const response=await fetchImpl(route.endpoint,{
        method:'POST',signal:controller.signal,
        headers:{'content-type':'application/json','authorization':'Bearer '+route.key},
        body:JSON.stringify(body)
      });
      if(!response.ok){
        const status=response.status;
        if([401,402,403].includes(status))
          throw infrastructureFailure(route.provider+'_AUTH_OR_BILLING_BLOCKED_NO_PAID_FALLBACK:'+status);
        if([400,404,429,500,502,503,504].includes(status)){
          let errorBody=null;
          if([400,429].includes(status)&&typeof response.json==='function')
            try{errorBody=await response.json();}catch{/* HTTP 상태만 기록한다. */}
          if(status===400){
            // 제공자별 요청 호환성 실패는 다른 검증된 무료 제공자만 시도한다.
            // 안전/정책 거절을 다른 제공자에서 우회하지 않는다.
            const detail=[errorBody?.error?.code,errorBody?.error?.type,errorBody?.error?.message].map(clean).join(' ');
            if(/content[-_ ]?(policy|filter)|safety|moderation|disallowed|policy[-_ ]?violation|prohibited|prompt[-_ ]?blocked/i.test(detail))
              throw infrastructureFailure(route.provider+'_CONTENT_POLICY_BLOCKED_NO_FALLBACK');
          }
          // 잘못된 모델/파라미터 400은 다음 실행에서 반복 요청하지 않도록 식힌다.
          const delay=status===400?Math.max(1800000,retryDelayMs(response,status,errorBody))
            :retryDelayMs(response,status,errorBody);
          cooldownUntil.set(slot,Date.now()+delay);
          failures.push(slot+':HTTP_'+status);
          console.log('VIBE2_EXTERNAL_FREE_ROTATE='+slot+':HTTP_'+status);
          continue;
        }
        throw infrastructureFailure(route.provider+'_HTTP_ERROR_NO_PAID_FALLBACK:'+status);
      }
      const payload=await response.json();
      if(Number(payload?.usage?.cost||0)>0)
        throw infrastructureFailure(route.provider+'_NONZERO_COST_RESPONSE_BLOCKED');
      const content=payload?.choices?.[0]?.message?.content;
      const text=typeof content==='string'?content:
        Array.isArray(content)?content.filter(item=>typeof item?.text==='string').map(item=>item.text).join(''):'';
      if(!text.trim()){
        cooldownUntil.set(slot,Date.now()+15000);
        failures.push(slot+':EMPTY_OUTPUT');
        continue;
      }
      console.log('VIBE2_EXTERNAL_AI_MODEL_USED='+slot);
      return{text,model:route.model};
    }catch(error){
      if(error?.name==='AbortError'||error instanceof TypeError||error instanceof SyntaxError){
        cooldownUntil.set(slot,Date.now()+15000);
        failures.push(slot+':TRANSPORT_OR_TIMEOUT');
        console.log('VIBE2_EXTERNAL_FREE_ROTATE='+slot+':TRANSPORT_OR_TIMEOUT');
        continue;
      }
      throw error;
    }finally{clearTimeout(timeout);}
  }
  const nextRetryAt=Math.min(...models.map(model=>cooldownUntil.get(model)||Infinity),...extraRoutes.map(route=>cooldownUntil.get(route.provider+':'+route.model)||Infinity));
  const retryAt=Number.isFinite(nextRetryAt)?nextRetryAt:0;
  const suffix=retryAt?':NEXT_RETRY_AT='+new Date(retryAt).toISOString():'';
  throw infrastructureFailure('GEMINI_FREE_TWO_MODEL_POOL_UNAVAILABLE_NO_LOCAL_FALLBACK:'+failures.join(',')+suffix,retryAt);
}
