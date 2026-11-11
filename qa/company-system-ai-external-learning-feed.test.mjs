import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildExternalAiLearningFeed } from '../tools/company-system-ai-external-learning-feed.mjs';
import { distillExternalAiKnowledge } from '../tools/vibe2-external-ai-distillation.mjs';

function accepted(overrides={}){
  return {
    id:'sys-a',status:'done',lastOutcome:'PRIMARY_AI_ACCEPTED',
    goal:'repair save restore workflow',responsibleFiles:['tools/save-router.mjs'],
    evidence:[
      'verification:success','primary-ai-review:PASS','actions-run:123',
      'changed-file:tools/save-router.mjs',
      'external-ai-provider:GEMINI',
      'external-ai-model:gemini-3.8-flash',
      'external-ai-raw-output-sha256:'+'a'.repeat(64)
    ],
    ...overrides
  };
}

test('verified accepted System AI result becomes raw-free external distillation candidate',()=>{
  const feed=buildExternalAiLearningFeed({tasks:[accepted()]});
  assert.equal(feed.records.length,1);
  const row=feed.records[0];
  assert.equal(row.sourceKind,'external-ai');
  assert.equal(row.provider,'GEMINI');
  assert.equal(row.model,'gemini-3.8-flash');
  assert.equal(row.rawOutputSha256,'a'.repeat(64));
  assert.equal('rawOutput' in row,false);
  assert.equal(row.verification.independent,true);
  assert.equal(row.verification.status,'PASS');
  assert.ok(row.verification.evidence.includes('qa:system-ai-deterministic-verification'));
  assert.ok(row.verification.evidence.some(x=>x.startsWith('source:verified-changed-file:')));
});

test('unreviewed or unverified System AI result is never fed to external learning',()=>{
  const pending=accepted({status:'awaiting-supervisor',lastOutcome:'PASS'});
  const noQa=accepted({evidence:[
    'primary-ai-review:PASS','actions-run:123','changed-file:tools/save-router.mjs',
    'external-ai-provider:GEMINI','external-ai-model:gemini-3.8-flash','external-ai-raw-output-sha256:'+'a'.repeat(64)
  ]});
  const feed=buildExternalAiLearningFeed({tasks:[pending,noQa]});
  assert.equal(feed.records.length,0);
});

test('missing model-output hash prevents external learning promotion',()=>{
  const bad=accepted({evidence:[
    'verification:success','primary-ai-review:PASS','actions-run:123',
    'changed-file:tools/save-router.mjs','external-ai-provider:GEMINI','external-ai-model:gemini-3.8-flash'
  ]});
  assert.equal(buildExternalAiLearningFeed({tasks:[bad]}).records.length,0);
});

test('verified feed candidate passes existing external AI distillation boundary',()=>{
  const feed=buildExternalAiLearningFeed({tasks:[accepted()]});
  const result=distillExternalAiKnowledge(feed,{entries:[]});
  assert.equal(result.accepted.length,1);
  assert.equal(result.rejected.length,0);
  assert.equal(result.knowledge.entries[0].rawOutputStored,false);
  assert.equal(result.knowledge.entries[0].advisoryOnly,true);
});

test('24H runner wires verified System AI feed before external distillation and web ingest',()=>{
  const workflow=fs.readFileSync('.github/workflows/vibe2-24h-runner.yml','utf8');
  const feed=workflow.indexOf('company-system-ai-external-learning-feed.mjs');
  const distill=workflow.indexOf('vibe2-external-ai-distillation.mjs',feed);
  const ingest=workflow.indexOf('vibe2-web-experience-ingest.mjs',distill);
  assert.ok(feed>=0&&distill>feed&&ingest>distill);
  assert.match(workflow,/system-ai-external-learning-feed\.log/);
  assert.match(workflow,/vibe2-external-ai-distillation\.log/);
});
test('기존 검증 증류에서 Gemini Groq OpenRouter 교사를 구분한다',()=>{
  const gemini=accepted();
  const others=[['GROQ','openai/gpt-oss-20b','b'],['OPENROUTER','google/gemma-4-31b-it:free','c']]
    .map(([provider,model,sha])=>accepted({id:'sys-'+provider.toLowerCase(),evidence:gemini.evidence.map(item=>
      item==='external-ai-provider:GEMINI'?'external-ai-provider:'+provider:
      item==='external-ai-model:gemini-3.8-flash'?'external-ai-model:'+model:
      item.startsWith('external-ai-raw-output-sha256:')?'external-ai-raw-output-sha256:'+sha.repeat(64):item)}));
  const feed=buildExternalAiLearningFeed({tasks:[gemini,...others]});
  assert.deepEqual(feed.records.map(x=>x.provider),['GEMINI','GROQ','OPENROUTER']);
  assert.equal(new Set(feed.records.map(x=>x.id)).size,3);
  assert.equal(distillExternalAiKnowledge(feed,{entries:[]}).accepted.length,3);
});

test('출처 누락, 공급자·모델 불일치, 미확인 유료 모델을 차단한다',()=>{
  const evidence=accepted().evidence;
  const missing=accepted({evidence:evidence.filter(x=>!x.startsWith('external-ai-provider:'))});
  const mismatch=accepted({evidence:evidence.map(x=>x==='external-ai-model:gemini-3.8-flash'?'external-ai-model:openai/gpt-oss-20b':x)});
  const paid=accepted({evidence:evidence.map(x=>x==='external-ai-model:gemini-3.8-flash'?'external-ai-model:gemini-paid-pro':x)});
  const unknown=accepted({evidence:evidence.map(x=>x==='external-ai-provider:GEMINI'?'external-ai-provider:UNVERIFIED':x)});
  assert.equal(buildExternalAiLearningFeed({tasks:[missing,mismatch,paid,unknown]}).records.length,0);
});

test('실제로 호출된 교사 공급자와 모델을 기존 피더에 전달한다',()=>{
  const worker=fs.readFileSync('tools/company-system-ai-worker.mjs','utf8');
  const workflow=fs.readFileSync('.github/workflows/company-system-ai-workers.yml','utf8');
  assert.match(worker,/invocation\.model=clean\(model\)/);
  assert.match(worker,/invocation\.provider=clean\(provider\)/);
  assert.match(workflow,/external-ai-provider:/);
});
