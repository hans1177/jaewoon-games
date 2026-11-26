// Vibe4 self-hosted coding model adapter. Runs on THIS MACHINE only.
// No public URL, cloud API, redirect, API key or fallback provider.
import http from 'node:http';

const MAX_RESPONSE_BYTES=2*1024*1024;
const clean=x=>String(x??'').trim();
export async function requestVibe4LoopbackModel({
  prompt='',model='',port=11434,maxPredict=3072,contextWindow=8192,
  timeoutMs=120000,temperature=0.08,ownerApproved=false,images=[]
}={}){
  if(ownerApproved!==true)throw Error('VIBE4_LOCAL_MODEL_OWNER_APPROVAL_REQUIRED');
  // Ollama model ID is a name, never a URL, URI or local filesystem path.
  // Allow optional namespace and tag, without permitting URL syntax or traversal.
  if(!/^(?:[A-Za-z0-9][A-Za-z0-9._-]*\/)?[A-Za-z0-9][A-Za-z0-9._-]*(?::[A-Za-z0-9][A-Za-z0-9._-]*)?$/.test(clean(model))
    ||clean(model).includes('..'))
    throw Error('VIBE4_LOCAL_MODEL_ID_REQUIRED');
  if(!Number.isInteger(Number(port))||Number(port)<1024||Number(port)>65535)
    throw Error('VIBE4_LOCAL_PORT_INVALID');
  if(!clean(prompt)||Buffer.byteLength(String(prompt),'utf8')>512000)
    throw Error('VIBE4_LOCAL_PROMPT_BOUNDS');
  // [시각 입력] 최대 세 장의 검증된 PNG만 동일 로컬 추론에 전달한다.
  if(!Array.isArray(images)||images.length>3)throw Error('VIBE4_LOCAL_IMAGE_COUNT_INVALID');
  for(const image of images){
    if(typeof image!=='string'||image.length>7000000||!/^[A-Za-z0-9+/]+={0,2}$/.test(image))
      throw Error('VIBE4_LOCAL_IMAGE_INVALID');
    const bytes=Buffer.from(image,'base64');
    if(bytes.toString('base64')!==image||bytes.length<128||bytes.length>5000000||
       !bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))
      throw Error('VIBE4_LOCAL_IMAGE_INVALID');
  }
  const predict=Math.max(128,Math.min(4096,Math.floor(Number(maxPredict)||3072)));
  const context=Math.max(2048,Math.min(32768,Math.floor(Number(contextWindow)||8192)));
  const timeout=Math.max(1000,Math.min(300000,Math.floor(Number(timeoutMs)||120000)));
  const temp=Math.max(0,Math.min(1,Number(temperature)||0));
  const payload=JSON.stringify({
    model:clean(model),prompt:String(prompt),stream:false,
    ...(images.length?{images,format:'json'}:{}),
    options:{num_predict:predict,num_ctx:context,temperature:temp}
  });
  return new Promise((resolve,reject)=>{
    let size=0;
    const req=http.request({
      hostname:'127.0.0.1',port:Number(port),path:'/api/generate',method:'POST',
      agent:false,timeout,headers:{
        'Content-Type':'application/json','Content-Length':Buffer.byteLength(payload),
        'Accept':'application/json'
      }
    },res=>{
      if(res.statusCode!==200){
        res.resume();reject(Error('VIBE4_LOCAL_INFERENCE_HTTP_'+res.statusCode));return;
      }
      const chunks=[];
      res.on('data',chunk=>{
        size+=chunk.length;
        if(size>MAX_RESPONSE_BYTES){
          req.destroy(Error('VIBE4_LOCAL_OUTPUT_TOO_LARGE'));return;
        }
        chunks.push(chunk);
      });
      res.on('end',()=>{
        try{
          const data=JSON.parse(Buffer.concat(chunks).toString('utf8'));
          if(!data||data.done!==true||typeof data.response!=='string'||!data.response.trim())
            throw Error('VIBE4_LOCAL_MODEL_INCOMPLETE_RESPONSE');
          resolve(data.response);
        }catch(error){reject(error)}
      });
      res.on('error',reject);
    });
    req.on('timeout',()=>req.destroy(Error('VIBE4_LOCAL_MODEL_TIMEOUT')));
    req.on('error',reject);
    req.end(payload);
  });
}
