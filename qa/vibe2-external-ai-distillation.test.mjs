import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { distillExternalAiKnowledge } from '../tools/vibe2-external-ai-distill.mjs';
import { retrieveUnifiedLearning } from '../tools/vibe2-learning-motor.mjs';

const sha256=v=>crypto.createHash('sha256').update(String(v??''),'utf8').digest('hex');

function packet(){
  return {
    version:1,
    kind:'external-ai-teacher-packet',
    provider:'example-provider',
    model:'example-teacher-model',
    items:[
      {
        id:'combat-server-authority',
        topic:'roblox combat',
        claim:'Authoritative combat resolution should remain on the server.',
        recommendedPattern:'Clients request actions; server validates state, range, cooldown and applies damage.',
        applicability:['roblox','combat','networking'],
        risks:['Never trust client damage values.']
      }
    ]
  };
}

function verification(raw){
  return {
    version:1,
    kind:'external-ai-teacher-verification',
    independentReview:'PASS',
    packetSha256:sha256(raw),
    verifiedItems:[
      {
        id:'combat-server-authority',
        status:'PASS',
        evidence:['independent-doc-check:remote-security','runtime-pattern-check:server-authority']
      }
    ]
  };
}

test('verified external AI knowledge is distilled as advisory-only with no promotion authority',()=>{
  const source=packet();
  const raw=JSON.stringify(source,null,2)+'\n';
  const result=distillExternalAiKnowledge({
    packetInput:source,
    packetRaw:raw,
    verificationInput:verification(raw),
    existingInput:{entries:[]}
  });
  assert.equal(result.accepted.length,1);
  assert.equal(result.skipped.length,0);
  const row=result.knowledge.entries[0];
  assert.equal(row.verified,true);
  assert.equal(row.distilled,true);
  assert.equal(row.authority,'ADVISORY_ONLY');
  assert.equal(row.rawExternalAiStored,false);
  assert.equal(row.sourceWrite,false);
  assert.equal(row.productionPass,false);
  assert.equal(row.masteryCredit,false);
  assert.equal(row.trainingSample,false);
  assert.equal(result.authorityExpanded,false);
});

test('external AI packet hash mismatch is rejected',()=>{
  const source=packet();
  const raw=JSON.stringify(source,null,2)+'\n';
  const bad={...verification(raw),packetSha256:'0'.repeat(64)};
  assert.throws(()=>distillExternalAiKnowledge({
    packetInput:source,
    packetRaw:raw,
    verificationInput:bad
  }),/sha256 mismatch/);
});

test('external AI item without two independent evidence items is skipped',()=>{
  const source=packet();
  const raw=JSON.stringify(source,null,2)+'\n';
  const weak=verification(raw);
  weak.verifiedItems[0].evidence=['single-check'];
  const result=distillExternalAiKnowledge({
    packetInput:source,
    packetRaw:raw,
    verificationInput:weak
  });
  assert.equal(result.accepted.length,0);
  assert.equal(result.skipped[0]?.reason,'INSUFFICIENT_INDEPENDENT_EVIDENCE');
});

test('distilled external AI knowledge is retrieval-only and ranked after verified internal learning',()=>{
  const source=packet();
  const raw=JSON.stringify(source,null,2)+'\n';
  const distilled=distillExternalAiKnowledge({
    packetInput:source,
    packetRaw:raw,
    verificationInput:verification(raw)
  }).knowledge;
  const context=retrieveUnifiedLearning({
    task:{goal:'roblox combat remote server damage validation',target:'roblox',gameId:'demo'},
    experienceInput:{records:[{
      id:'verified-internal',
      verified:true,
      reusable:true,
      outcome:'PASS',
      gameId:'demo',
      engine:'roblox',
      problem:'combat remote validation',
      reusablePatterns:['server validates combat request']
    }]},
    codePatternsInput:{patterns:[]},
    playbooksInput:{taskTypes:{}},
    masteryInput:{},
    externalAiKnowledgeInput:distilled
  });
  assert.equal(context.experience[0]?.id,'verified-internal');
  assert.equal(context.externalKnowledge.length,1);
  assert.equal(context.externalKnowledge[0].authority,'ADVISORY_ONLY');
  assert.equal(context.priority.at(-1),'DISTILLED_EXTERNAL_ADVISORY_LAST');
});
