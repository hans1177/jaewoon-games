import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const worker=fs.readFileSync(new URL('../tools/company-system-ai-worker.mjs',import.meta.url),'utf8');
const start=worker.indexOf('async function requestModel(');
const end=worker.indexOf('\nfunction applyExactEdit(',start);
assert.ok(start>0&&end>start,'existing model request boundary remains available');
const method=worker.slice(start,end);

function harness(env,fetch){
  const context={process:{env},fetch,AbortController,setTimeout,clearTimeout,JSON,Math,Number,String,encodeURIComponent};
  vm.runInNewContext(`
    const clean=v=>String(v??'').trim();
    const PROVIDER=process.env.SYSTEM_AI_PROVIDER||'gemini';
    const MODEL=PROVIDER==='openai'?(process.env.SYSTEM_AI_OPENAI_MODEL||'gpt-5-mini'):(process.env.SYSTEM_AI_GEMINI_MODEL||'gemini-2.5-flash');
    const TIMEOUT=30000,NUM_PREDICT=8192;
    ${method}
    globalThis.invoke=requestModel;
  `,context);
  return context.invoke;
}

test('OpenAI provider uses external Responses API with no persisted response',async()=>{
  const calls=[];
  const invoke=harness({SYSTEM_AI_PROVIDER:'openai',OPENAI_API_KEY:'test-only'},async(url,options)=>{
    calls.push({url,options});
    return {ok:true,json:async()=>({status:'completed',output:[{type:'message',content:[{type:'output_text',text:'{"summary":"ok"}'}]}]})};
  });
  assert.equal(await invoke('Return JSON'),'{"summary":"ok"}');
  assert.equal(calls.length,1);
  assert.equal(calls[0].url,'https://api.openai.com/v1/responses');
  assert.equal(calls[0].options.headers.authorization,'Bearer test-only');
  assert.equal(JSON.parse(calls[0].options.body).store,false);
  assert.equal(JSON.parse(calls[0].options.body).text.format.type,'json_object');
});

test('OpenAI missing key and unsuccessful result never fall back locally',async()=>{
  const missing=harness({SYSTEM_AI_PROVIDER:'openai'},async()=>{throw new Error('fetch should not run')});
  await assert.rejects(missing('test'),/SYSTEM_AI_OPENAI_KEY_MISSING_NO_LOCAL_FALLBACK/);
  const invalid=harness({SYSTEM_AI_PROVIDER:'openai',OPENAI_API_KEY:'test-only'},async()=>({ok:true,json:async()=>({status:'incomplete',output:[]})}));
  await assert.rejects(invalid('test'),/SYSTEM_AI_OPENAI_RESPONSE_NOT_COMPLETE_NO_LOCAL_FALLBACK/);
});

test('default provider preserves Gemini request path',async()=>{
  let url='';
  const invoke=harness({GEMINI_API_KEY:'test-only'},async(u)=>{url=u;return {ok:true,json:async()=>({candidates:[{content:{parts:[{text:'{"summary":"gemini"}'}]}}]})}});
  assert.equal(await invoke('Return JSON'),'{"summary":"gemini"}');
  assert.ok(url.includes('generativelanguage.googleapis.com'));
});
