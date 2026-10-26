// 파일명: qa/vibe2-gemini-free-rotation.test.mjs
import test from 'node:test';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {GEMINI_FREE_MODELS,VERIFIED_FREE_FALLBACK_MODELS,verifiedFreeGeminiModels,requestGeminiFreePair,retryDelayMs} from '../tools/vibe2-gemini-free-rotation.mjs';
import {requestLocalModel,generateCandidateWithRecovery} from '../tools/vibe2-source-worker.mjs';
import os from 'node:os';
import path from 'node:path';
import {requestPracticeModel} from '../tools/vibe2-learning-practice-worker.mjs';

function fixtureResponse(text){return{ok:true,json:async()=>({candidates:[{content:{parts:[{text}]}}]})};}
async function withExternalFixture(fn){
  const keys=['GEMINI_API_KEY','VIBE2_GAME_SOURCE_PROVIDER','VIBE2_GEMINI_MODEL','VIBE2_GEMINI_BACKUP_MODEL','GROQ_API_KEY','OPENROUTER_API_KEY','VIBE2_EXTERNAL_FREE_ROTATION','VIBE2_GROQ_FREE_PLAN_VERIFIED'];
  const original=Object.fromEntries(keys.map(k=>[k,process.env[k]])),priorFetch=globalThis.fetch;
  try{
    process.env.GEMINI_API_KEY='test-key-not-real';
    process.env.VIBE2_GAME_SOURCE_PROVIDER='GEMINI_API';
    process.env.VIBE2_GEMINI_MODEL='gemini-3.8-flash';
    process.env.VIBE2_GEMINI_BACKUP_MODEL='gemini-3.5-flash-lite';
    for(const key of ['GROQ_API_KEY','OPENROUTER_API_KEY','VIBE2_EXTERNAL_FREE_ROTATION','VIBE2_GROQ_FREE_PLAN_VERIFIED'])delete process.env[key];
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

test('missing production API key is infrastructure failure and never makes a remote or local call',async()=>{
  await withExternalFixture(async()=>{
    delete process.env.GEMINI_API_KEY;
    let calls=0;
    globalThis.fetch=async()=>{calls++;throw new Error('unexpected fetch');};
    await assert.rejects(requestLocalModel('code'),error=>{
      assert.equal(error?.vibe2InfrastructureFailure,true);
      assert.match(error.message,/GEMINI_API_KEY_MISSING_NO_LOCAL_FALLBACK/);
      return true;
    });
    assert.equal(calls,0);
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

test('free quota cooldown honors provider retry metadata and stops daily quota retry storms',()=>{
  assert.equal(retryDelayMs({headers:{get:()=> '10'}},429),10000);
  assert.equal(retryDelayMs({},429,{error:{details:[{'@type':'type.googleapis.com/google.rpc.RetryInfo',retryDelay:'75s'}]}}),75000);
  assert.equal(retryDelayMs({},429,{error:{message:'GenerateRequestsPerDayPerProjectPerModel-FreeTier reached'}}),86400000);
});

test('an empty external source response rotates to the other free model',async()=>{
  await withExternalFixture(async()=>{
    // Use an isolated module instance so its 15s cooldown never affects later quota tests.
    const {requestGeminiFreePair:isolatedRequest}=await import('../tools/vibe2-gemini-free-rotation.mjs?test=empty-output-rotation');
    const urls=[];
    const result=await isolatedRequest({apiKey:'test-key-not-real',contents:[],fetchImpl:async url=>{
      urls.push(String(url));
      return fixtureResponse(urls.length===1?'':'{"edits":[]}');
    }});
    assert.equal(result.text,'{"edits":[]}');
    assert.equal(urls.length,2);
    assert.notEqual(urls[0],urls[1]);
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

test('active Vibe and Roblox release paths do not install, pull or request local Ollama models',()=>{
  const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
  const workflowPaths=[
    '.github/workflows/vibe2-continuous-core.yml',
    '.github/workflows/vibe2-candidate-release.yml',
    '.github/workflows/company-development-roblox-runtime.yml',
    '.github/workflows/post-modification-revote.yml'
  ];
  for(const file of workflowPaths){
    const workflow=read(file);
    assert.doesNotMatch(workflow,/uses:\s*\.\/\.github\/actions\/prepare-ollama/,'no active local model action: '+file);
    assert.doesNotMatch(workflow,/ollama pull|ollama serve|ollama\.com\/install\.sh/,'no local model installation: '+file);
  }
  const scripts=[
    'tools/vibe2-source-worker.mjs',
    'tools/vibe2-learning-practice-worker.mjs',
    'tools/company-development-roblox-build-preflight.mjs',
    'tools/autonomous-development-worker.mjs',
    'tools/autonomous-department-cycle.mjs',
    'tools/company-post-modification-review.mjs'
  ];
  for(const file of scripts){
    const source=read(file);
    assert.doesNotMatch(source,/127\.0\.0\.1:11434|\/api\/generate|\/api\/chat|callOllama\(/,'no local HTTP calls: '+file);
  }
  assert.match(read('tools/company-development-roblox-build-preflight.mjs'),/requestGeminiFreePair\(/);
  assert.match(read('.github/workflows/company-development-roblox-runtime.yml'),/ROBLOX_PACKAGE_PREFLIGHT_FUSION=ENABLED/);
  assert.match(read('.github/workflows/vibe2-candidate-release.yml'),/company-development-roblox-build-preflight\.mjs/);
  assert.match(read('.github/workflows/vibe2-continuous-core.yml'),/VIBE2_WORKER_PROVIDER=GEMINI_API/);
});

// [외부 무료 공급자] 추가 요금 없이 두 Gemini 슬롯이 제한되면 무료 OpenRouter만 대체한다.
test('Gemini 429 failover reaches only a pinned OpenRouter free model',async()=>{
  await withExternalFixture(async()=>{
    process.env.OPENROUTER_API_KEY='openrouter-test-secret';
    process.env.VIBE2_EXTERNAL_FREE_ROTATION='YES';
    const {requestGeminiFreePair:isolated}=await import('../tools/vibe2-gemini-free-rotation.mjs?test=openrouter-free-'+Date.now());
    const calls=[];
    const response=await isolated({apiKey:'gemini-test-secret',
      contents:[{role:'user',parts:[{text:'JSON source task'}]}],
      fetchImpl:async(url,options)=>{
        calls.push({url:String(url),options});
        if(String(url).includes('googleapis.com'))return{ok:false,status:429,headers:{get:()=> '90'}};
        return{ok:true,json:async()=>({choices:[{message:{content:'{"edits":[]}'}}],usage:{cost:0}})};
      }
    });
    assert.equal(response.text,'{"edits":[]}');
    assert.equal(calls.length,3);
    const last=calls.at(-1),body=JSON.parse(last.options.body);
    assert.equal(last.url,'https://openrouter.ai/api/v1/chat/completions');
    assert.equal(body.model,VERIFIED_FREE_FALLBACK_MODELS.OPENROUTER);
    assert.ok(body.model.endsWith(':free'));
    assert.equal(body.model,'google/gemma-4-31b-it:free','pin only a currently published, explicitly free model; never a paid base slug');
    assert.equal(body.messages[0].content,'JSON source task');
    assert.equal(last.options.headers.authorization,'Bearer openrouter-test-secret');
    assert.ok(!last.options.body.includes('gemini-test-secret'));
    assert.ok(!last.options.body.includes('openrouter-test-secret'));
  });
});

test('Groq route requires an explicitly confirmed free plan; never infers it from API key',async()=>{
  await withExternalFixture(async()=>{
    process.env.GROQ_API_KEY='groq-test-secret';
    process.env.VIBE2_EXTERNAL_FREE_ROTATION='YES';
    const {requestGeminiFreePair:isolated}=await import('../tools/vibe2-gemini-free-rotation.mjs?test=groq-unverified-'+Date.now());
    const calls=[];
    await assert.rejects(isolated({apiKey:'test',contents:[],fetchImpl:async url=>{
      calls.push(String(url));
      return{ok:false,status:429,headers:{get:()=> '30'}};
    }}),/GEMINI_FREE_TWO_MODEL_POOL_UNAVAILABLE/);
    assert.equal(calls.length,2,'no unverified Groq free-plan request may leave the worker');
  });
});

test('verified Groq free plan uses the pinned free-plan model and on-demand tier only',async()=>{
  await withExternalFixture(async()=>{
    process.env.GROQ_API_KEY='groq-test-secret';
    process.env.VIBE2_EXTERNAL_FREE_ROTATION='YES';
    process.env.VIBE2_GROQ_FREE_PLAN_VERIFIED='YES';
    const {requestGeminiFreePair:isolated}=await import('../tools/vibe2-gemini-free-rotation.mjs?test=groq-verified-'+Date.now());
    const calls=[];
    const result=await isolated({apiKey:'test',contents:[{role:'user',parts:[{text:'code'}]}],
      fetchImpl:async(url,options)=>{
        calls.push({url:String(url),options});
        if(String(url).includes('googleapis.com'))return{ok:false,status:429,headers:{get:()=> '60'}};
        return{ok:true,json:async()=>({choices:[{message:{content:'{"ok":true}'}}]})};
      }
    });
    assert.equal(result.text,'{"ok":true}');
    assert.equal(calls.length,3);
    const groq=calls.at(-1);
    assert.equal(groq.url,'https://api.groq.com/openai/v1/chat/completions');
    const body=JSON.parse(groq.options.body);
    assert.equal(body.service_tier,'on_demand');
    assert.equal(body.model,VERIFIED_FREE_FALLBACK_MODELS.GROQ);
    assert.ok(!JSON.stringify(body).includes('groq-test-secret'));
  });
});

test('paid billing rejection fails closed without calling a second provider',async()=>{
  await withExternalFixture(async()=>{
    process.env.GROQ_API_KEY='groq-test-secret';
    process.env.OPENROUTER_API_KEY='openrouter-test-secret';
    process.env.VIBE2_EXTERNAL_FREE_ROTATION='YES';
    process.env.VIBE2_GROQ_FREE_PLAN_VERIFIED='YES';
    const {requestGeminiFreePair:isolated}=await import('../tools/vibe2-gemini-free-rotation.mjs?test=billing-block-'+Date.now());
    const urls=[];
    await assert.rejects(isolated({apiKey:'test',contents:[{role:'user',parts:[{text:'x'}]}],fetchImpl:async url=>{
      urls.push(String(url));
      if(String(url).includes('googleapis.com'))return{ok:false,status:429,headers:{get:()=> '45'}};
      return{ok:false,status:402};
    }}),/GROQ_AUTH_OR_BILLING_BLOCKED_NO_PAID_FALLBACK:402/);
    assert.equal(urls.length,3,'no OpenRouter call after a billing block');
  });
});

test('canonical Web/Roblox steps receive secrets without exposing values or altering the model ownership',()=>{
  const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
  for(const file of [
    '.github/workflows/vibe2-continuous-core.yml',
    '.github/workflows/company-development-roblox-runtime.yml',
    '.github/workflows/vibe2-candidate-release.yml'
  ]){
    const workflow=read(file);
    assert.ok(workflow.includes('GROQ_API_KEY: ${{ secrets.GROQ_API_KEY }}'),'required key is present only at the model call step');
    assert.ok(workflow.includes('OPENROUTER_API_KEY: ${{ secrets.OPENROUTER_API_KEY }}'),'required key is present only at the model call step');
    assert.ok(workflow.includes("VIBE2_GROQ_FREE_PLAN_VERIFIED: ${{ vars.VIBE2_GROQ_FREE_PLAN_VERIFIED || 'YES' }}"),'owner-confirmed free plan may be disabled by setting NO');
    assert.match(workflow,/VIBE2_EXTERNAL_FREE_ROTATION: 'YES'/);
  }
  assert.match(read('.github/workflows/vibe2-continuous-core.yml'),/VIBE2_GAME_SOURCE_PROVIDER: GEMINI_API/);
});


// Regression: a provider validation error does not disable an independently verified free route.
test('non-policy Groq request error continues to the pinned free OpenRouter route',async()=>{
  await withExternalFixture(async()=>{
    process.env.GROQ_API_KEY='unit-groq';
    process.env.OPENROUTER_API_KEY='unit-openrouter';
    process.env.VIBE2_EXTERNAL_FREE_ROTATION='YES';
    process.env.VIBE2_GROQ_FREE_PLAN_VERIFIED='YES';
    const {requestGeminiFreePair:request}=await import('../tools/vibe2-gemini-free-rotation.mjs?regression=route-'+Date.now());
    const calls=[];
    const result=await request({
      apiKey:'unit-gemini',
      contents:[{role:'user',parts:[{text:'source repair'}]}],
      fetchImpl:async(url,options)=>{
        const endpoint=String(url);
        calls.push({endpoint,body:JSON.parse(options.body)});
        if(endpoint.includes('googleapis.com'))return {ok:false,status:429,headers:{get:()=> '120'}};
        if(endpoint.includes('api.groq.com'))return {ok:false,status:400,json:async()=>({error:{type:'invalid_request_error',message:'unsupported argument'}})};
        return {ok:true,json:async()=>({choices:[{message:{content:'{"edits":[]}'}}],usage:{cost:0}})};
      }
    });
    assert.equal(result.text,'{"edits":[]}');
    assert.equal(calls.length,4);
    assert.equal(calls[2].body.service_tier,'on_demand');
    assert.equal(calls[2].body.max_completion_tokens,3072);
    assert.equal(Object.hasOwn(calls[2].body,'max_tokens'),false);
    assert.equal(calls[3].body.model,VERIFIED_FREE_FALLBACK_MODELS.OPENROUTER);
  });
});


test('provider policy rejection stops free-provider rotation without bypass',async()=>{
  await withExternalFixture(async()=>{
    process.env.GROQ_API_KEY='unit-groq';
    process.env.OPENROUTER_API_KEY='unit-openrouter';
    process.env.VIBE2_EXTERNAL_FREE_ROTATION='YES';
    process.env.VIBE2_GROQ_FREE_PLAN_VERIFIED='YES';
    const {requestGeminiFreePair:request}=await import('../tools/vibe2-gemini-free-rotation.mjs?regression=policy-'+Date.now());
    const urls=[];
    await assert.rejects(request({
      apiKey:'unit-gemini',
      contents:[{role:'user',parts:[{text:'fixture'}]}],
      fetchImpl:async(url)=>{
        urls.push(String(url));
        if(String(url).includes('googleapis.com'))return {ok:false,status:429,headers:{get:()=> '120'}};
        return {ok:false,status:400,json:async()=>({error:{type:'invalid_request_error',message:'content policy violation'}})};
      }
    }),/GROQ_CONTENT_POLICY_BLOCKED_NO_FALLBACK/);
    assert.equal(urls.length,3);
    assert.ok(urls.every(url=>!url.includes('openrouter.ai')));
  });
});

for(const provider of ['GROQ','OPENROUTER']){
  test(provider+' context overflow does not disable the next independent source request',async()=>{
    await withExternalFixture(async()=>{
      process.env.VIBE2_EXTERNAL_FREE_ROTATION='YES';
      if(provider==='GROQ'){
        process.env.GROQ_API_KEY='fixture-not-real';
        process.env.VIBE2_GROQ_FREE_PLAN_VERIFIED='YES';
      }else process.env.OPENROUTER_API_KEY='fixture-not-real';
      const {requestGeminiFreePair:request}=await import('../tools/vibe2-gemini-free-rotation.mjs?context-'+provider+'-'+Date.now());
      let providerCalls=0;
      const fetchImpl=async(url)=>{
        if(String(url).includes('googleapis.com'))return{ok:false,status:429,headers:{get:()=> '60'}};
        providerCalls++;
        if(providerCalls===1)return{ok:false,status:400,json:async()=>({error:{code:'context_length_exceeded',message:'maximum context length exceeded'}})};
        return{ok:true,json:async()=>({choices:[{message:{content:'{"edits":[]}'}}],usage:{cost:0}})};
      };
      await assert.rejects(request({apiKey:'fixture',contents:[{role:'user',parts:[{text:'oversized source fixture'}]}],fetchImpl}),/GEMINI_FREE_TWO_MODEL_POOL_UNAVAILABLE/);
      const result=await request({apiKey:'fixture',contents:[{role:'user',parts:[{text:'independent bounded source fixture'}]}],fetchImpl});
      assert.equal(providerCalls,2,'one request context error must not impose provider-wide cooldown');
      assert.equal(result.text,'{"edits":[]}');
    });
  });
}

// 초기 압축 뒤 자산 계약을 재첨부해 요청이 다시 수 MB로 커지던 실제 전송 경계 회귀.
test('final model request stays bounded after a megabyte asset reference is reattached',async t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'vibe-request-boundary-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  fs.writeFileSync(path.join(root,'ui.js'),'const x=1;');
  const source='Engine: web\nAllowed edit paths: ui.js\n=== FILE ui.js [EDITABLE] ===\nconst x=1;\n';
  const contract='[ASSET IMPLEMENTATION CONTRACT BEGIN]\n'+JSON.stringify({
    source:'assets/common/ui.js',catalog:'reference '.repeat(140000),runtimeVerified:false
  })+'\nNever invent assets or runtime evidence.\n[ASSET IMPLEMENTATION CONTRACT END]';
  const prompt=source+contract;
  await withExternalFixture(async()=>{
    let sent='';
    globalThis.fetch=async(url,options)=>{
      sent=JSON.parse(options.body).contents[0].parts[0].text;
      return fixtureResponse(JSON.stringify({edits:[{path:'ui.js',find:'const x=1;',replace:'const x=2;'}]}));
    };
    const result=await generateCandidateWithRecovery({prompt,target:'web',sourceRoot:root,
      sourceRootRelative:'web-games/demo',responsibleFiles:['ui.js'],allowFullRewrite:false});
    assert.ok(Buffer.byteLength(sent,'utf8')<128000);
    assert.match(sent,/Allowed edit paths: ui.js/);
    assert.match(sent,/const x=1;/);
    assert.match(sent,/READ_ONLY_REFERENCE_EXCERPT/);
    assert.match(sent,/originalSha256=[a-f0-9]{64}/);
    assert.match(sent,/Missing facts remain unresolved/);
    assert.match(sent,/Never invent assets or runtime evidence/);
    assert.equal(result.candidate.edits[0].path,'ui.js');
    assert.ok(prompt.includes(contract),'original work order remains unchanged');
  });
});
