// File: tools/vibe2-gemini-free-rotation.mjs
// One shared external-model route for source generation and learning practice.
// No local model fallback, extra pipeline, credential switching or implicit paid tier escalation.
export const GEMINI_FREE_MODELS=Object.freeze(['gemini-3.8-flash','gemini-3.5-flash-lite']);
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
    if(/^\\d+(?:\\.\\d+)?s$/.test(providerDelay))delay=Number(providerDelay.slice(0,-1))*1000;
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
  const nextRetryAt=Math.min(...models.map(model=>cooldownUntil.get(model)||Infinity));
  const retryAt=Number.isFinite(nextRetryAt)?nextRetryAt:0;
  const suffix=retryAt?':NEXT_RETRY_AT='+new Date(retryAt).toISOString():'';
  throw infrastructureFailure('GEMINI_FREE_TWO_MODEL_POOL_UNAVAILABLE_NO_LOCAL_FALLBACK:'+failures.join(',')+suffix,retryAt);
}
