import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { promoteVerifiedSystemAiLearning } from '../tools/company-system-ai-learning.mjs';

test('ordinary System AI result promotes only after verified Primary-AI acceptance',()=>{
  const result=promoteVerifiedSystemAiLearning({
    systemAiInput:{tasks:[{
      id:'sys-accepted',status:'done',lastOutcome:'PRIMARY_AI_ACCEPTED',department:'infrastructure',
      goal:'repair workflow routing',responsibleFiles:['tools/router.mjs'],verificationCommands:['node --test qa/router.test.mjs'],
      evidence:['actions-run:1','verification:success','primary-ai-review:PASS','changed-file:tools/router.mjs','source-mutation-sha:abc123']
    }]},
    experienceInput:{version:3,records:[]},libraryInput:{patterns:[]}
  });
  assert.equal(result.experienceAdded,1);
  assert.equal(result.patternsAdded,1);
  assert.equal(result.experience.records[0].authority,'VERIFIED_SYSTEM_AI_LEARNING');
  assert.equal(result.library.patterns[0].authority,'VERIFIED_SYSTEM_AI_CODE_PATTERN');
  assert.equal(result.queue.tasks[0].learningPromotion,'PROMOTED');
});

test('unreviewed System AI PASS candidate is not promoted',()=>{
  const result=promoteVerifiedSystemAiLearning({
    systemAiInput:{tasks:[{
      id:'sys-pending',status:'awaiting-supervisor',lastOutcome:'PASS',goal:'candidate',
      responsibleFiles:['tools/x.mjs'],evidence:['verification:success','changed-file:tools/x.mjs','source-mutation-sha:def456']
    }]},
    experienceInput:{version:3,records:[]},libraryInput:{patterns:[]}
  });
  assert.equal(result.experienceAdded,0);
  assert.equal(result.patternsAdded,0);
});

test('deterministic current-main verification may become experience but not a code pattern without source mutation',()=>{
  const result=promoteVerifiedSystemAiLearning({
    systemAiInput:{tasks:[{
      id:'sys-current',status:'done',lastOutcome:'DETERMINISTIC_CURRENT_MAIN_SATISFIED',
      goal:'verify existing deterministic contract',verificationCommands:['node --test qa/x.test.mjs'],
      evidence:['actions-run:2','deterministic-current-main-satisfied']
    }]},
    experienceInput:{version:3,records:[]},libraryInput:{patterns:[]}
  });
  assert.equal(result.experienceAdded,1);
  assert.equal(result.patternsAdded,0);
  assert.equal(result.experience.records[0].authority,'VERIFIED_SYSTEM_AI_LEARNING');
});

test('marketing requires joint Primary-AI and Vibe acceptance',()=>{
  const accepted=promoteVerifiedSystemAiLearning({
    systemAiInput:{tasks:[{
      id:'marketing-demo-pre-release-v1',status:'done',department:'planning-growth-marketing',
      lastOutcome:'PRIMARY_AI_VIBE_JOINT_ACCEPTED',goal:'verified organic marketing package',
      responsibleFiles:['company-learning/marketing/demo/latest.json'],
      evidence:['actions-run:3','verification:success','primary-ai-vibe-joint-accept:YES','changed-file:company-learning/marketing/demo/latest.json','source-mutation-sha:feedbeef']
    }]},
    experienceInput:{version:3,records:[]},libraryInput:{patterns:[]}
  });
  assert.equal(accepted.experienceAdded,1);
  assert.equal(accepted.experience.records[0].authority,'VERIFIED_SYSTEM_AI_MARKETING_LEARNING');

  const rejected=promoteVerifiedSystemAiLearning({
    systemAiInput:{tasks:[{
      id:'marketing-review',status:'done',department:'planning-growth-marketing',
      lastOutcome:'PRIMARY_AI_ACCEPTED',evidence:['primary-ai-review:PASS']
    }]},
    experienceInput:{version:3,records:[]},libraryInput:{patterns:[]}
  });
  assert.equal(rejected.experienceAdded,0);
});

test('mutation-required System AI learning refuses missing mutation evidence',()=>{
  const result=promoteVerifiedSystemAiLearning({
    systemAiInput:{tasks:[{
      id:'sys-mutation-required',status:'done',lastOutcome:'PRIMARY_AI_ACCEPTED',
      sourceMutationRequired:true,responsibleFiles:['tools/x.mjs'],
      evidence:['verification:success','primary-ai-review:PASS']
    }]},
    experienceInput:{version:3,records:[]},libraryInput:{patterns:[]}
  });
  assert.equal(result.experienceAdded,0);
  assert.equal(result.patternsAdded,0);
});

test('24H runner executes System AI learning before verified-learning motor rerun',()=>{
  const workflow=fs.readFileSync('.github/workflows/vibe2-24h-runner.yml','utf8');
  const fanIn=workflow.indexOf('tools/company-system-ai-learning.mjs');
  const motor=workflow.indexOf('SYSTEM_AI_LEARNING_EXPERIENCE_ADDED');
  assert.ok(fanIn>=0&&motor>fanIn);
  assert.match(workflow,/SYSTEM_AI_LEARNING_PATTERNS_ADDED/);
  assert.match(workflow,/vibe2-system-ai-learning\.log/);
});
