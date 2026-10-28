// Vibe4 self-hosted coding model adapter. Runs on THIS MACHINE only.
// No public URL, cloud API, redirect, API key or fallback provider.
import http from 'node:http';

const MAX_RESPONSE_BYTES=2*1024*1024;
const clean=x=>String(x??'').trim();
export async function requestVibe4LoopbackModel({
  prompt='',model='',port=11434,maxPredict=3072,contextWindow=8192,
  timeoutMs=120000,temperature=0.08,ownerApproved=false
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
  const predict=Math.max(128,Math.min(4096,Math.floor(Number(maxPredict)||3072)));
  const context=Math.max(2048,Math.min(32768,Math.floor(Number(contextWindow)||8192)));
  const timeout=Math.max(1000,Math.min(300000,Math.floor(Number(timeoutMs)||120000)));
  const temp=Math.max(0,Math.min(1,Number(temperature)||0));
  const payload=JSON.stringify({
    model:clean(model),prompt:String(prompt),stream:false,
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
