import test from 'node:test';
import assert from 'node:assert/strict';
import {GEMINI_FREE_MODELS,verifiedFreeGeminiModels,requestGeminiFreePair} from '../tools/vibe2-gemini-free-rotation.mjs';
import {requestLocalModel} from '../tools/vibe2-source-worker.mjs';
import {requestPracticeModel} from '../tools/vibe2-learning-practice-worker.mjs';

function fixtureResponse(text){return{ok:true,json:async()=>({candidates:[{content:{parts:[{text}]}}]})};}
async function withExternalFixture(fn){
  const keys=['GEMINI_API_KEY','VIBE2_GAME_SOURCE_PROVIDER','VIBE2_GEMINI_MODEL','VIBE2_GEMINI_BACKUP_MODEL'];
  const original=Object.fromEntries(keys.map(k=>[k,process.env[k]])),priorFetch=globalThis.fetch;
  try{
    process.env.GEMINI_API_KEY='test-key-not-real';
    process.env.VIBE2_GAME_SOURCE_PROVIDER='GEMINI_API';
    process.env.VIBE2_GEMINI_MODEL='gemini-3.8-flash';
    process.env.VIBE2_GEMINI_BACKUP_MODEL='gemini-3.5-flash-lite';
    await fn();
  }finally{
    globalThis.fetch=priorFetch;
    for(const [key,value] of Object.entries(original)){
      if(value===undefined)delete process.env[key];else process.env[key]=value;
    }
  }
}

test('free route pins exactly two published Gemini model IDs and rejects unapproved paid routes',async()=>{
  assert.deepEqual([...GEMINI_FREE_MODELS],['gemini-3.8-flash','gemini-3.5-flash-lite']);
  assert.deepEqual(verifiedFreeGeminiModels({}),[...GEMINI_FREE_MODELS]);
  assert.throws(()=>verifiedFreeGeminiModels({VIBE2_GEMINI_MODEL:'gemini-4-argon'}),/GEMINI_FREE_MODEL_PAIR_INVALID/);
});

test('actual Vibe2 game source function invokes only approved external AI and preserves JSON code output',async()=>{
  await withExternalFixture(async()=>{
    const calls=[];
    globalThis.fetch=async(url,options)=>{
      calls.push({url:String(url),options});
      return fixtureResponse('{"edits":[]}');
    };
    const text=await requestLocalModel('SOURCE_FIXTURE_PROMPT',{maxPredict:2048,temperature:.1});
    assert.equal(text,'{"edits":[]}');
    assert.equal(calls.length,1);
    assert.match(calls[0].url,/^https:\/\/generativelanguage\.googleapis\.com\//);
    assert.ok(GEMINI_FREE_MODELS.some(model=>calls[0].url.includes(model)));
    assert.equal(JSON.parse(calls[0].options.body).contents[0].parts[0].text,'SOURCE_FIXTURE_PROMPT');
    process.env.VIBE2_GAME_SOURCE_PROVIDER='OLLAMA';
    await assert.rejects(requestLocalModel('x'),/LOCAL_AI_PERMANENTLY_FORBIDDEN/);
    assert.equal(calls.length,1);
  });
});

test('existing learning practice function shares external free pair and requests structured JSON',async()=>{
  await withExternalFixture(async()=>{
    let count=0;
    globalThis.fetch=async(url,options)=>{
      count++;
      assert.ok(GEMINI_FREE_MODELS.some(model=>String(url).includes(model)));
      assert.equal(JSON.parse(options.body).generationConfig.responseMimeType,'application/json');
      return fixtureResponse('{"strategy":"keep the original owner"}');
    };
    assert.match(await requestPracticeModel('PRACTICE_FIXTURE_PROMPT'),/original owner/);
    assert.equal(count,1);
  });
});

test('billing/auth 403 never falls through to another model',async()=>{
  await withExternalFixture(async()=>{
    let count=0;
    const fetchImpl=async()=>{count++;return{ok:false,status:403};};
    await assert.rejects(requestGeminiFreePair({apiKey:'test-key-not-real',contents:[],fetchImpl}),/GEMINI_AUTH_OR_BILLING_BLOCKED_NO_LOCAL_FALLBACK:403/);
    assert.equal(count,1);
  });
});

test('quota 429 rotates to the other model, honors Retry-After, and does not retry a blocked slot',async()=>{
  await withExternalFixture(async()=>{
    const urls=[];
    const fetchImpl=async(url)=>{
      urls.push(String(url));
      if(urls.length===1)return{ok:false,status:429,headers:{get:()=> '10'}};
      return fixtureResponse('{"source":"candidate"}');
    };
    const first=await requestGeminiFreePair({apiKey:'test-key-not-real',contents:[{role:'user',parts:[{text:'source'}]}],fetchImpl});
    assert.equal(first.text,'{"source":"candidate"}');
    assert.equal(urls.length,2);
    assert.notEqual(urls[0],urls[1]);
    assert.ok(urls.every(value=>GEMINI_FREE_MODELS.some(model=>value.includes(model))));
    const nextUrls=[];
    const next=await requestGeminiFreePair({apiKey:'test-key-not-real',contents:[],fetchImpl:async url=>{
      nextUrls.push(String(url));return fixtureResponse('{"next":true}');
    }});
    assert.equal(next.text,'{"next":true}');
    assert.equal(nextUrls.length,1,'cooldown skips 429 model rather than repeatedly consuming requests');
    assert.equal(nextUrls[0],urls[1]);
  });
});
