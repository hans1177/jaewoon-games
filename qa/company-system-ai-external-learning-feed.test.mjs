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
      'external-ai-model:qwen3:1.7b',
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
  assert.equal(row.provider,'LOCAL_OLLAMA_SUPERVISED_SYSTEM_AI');
  assert.equal(row.model,'qwen3:1.7b');
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
    'external-ai-model:qwen3:1.7b','external-ai-raw-output-sha256:'+'a'.repeat(64)
  ]});
  const feed=buildExternalAiLearningFeed({tasks:[pending,noQa]});
  assert.equal(feed.records.length,0);
});

test('missing model-output hash prevents external learning promotion',()=>{
  const bad=accepted({evidence:[
    'verification:success','primary-ai-review:PASS','actions-run:123',
    'changed-file:tools/save-router.mjs','external-ai-model:qwen3:1.7b'
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
  assert.match(workflow,/SYSTEM_AI_EXTERNAL_LEARNING_CANDIDATES/);
  assert.match(workflow,/VIBE2_EXTERNAL_AI_ACCEPTED/);
});
