import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { promoteVerifiedSystemAiLearning } from '../tools/company-system-ai-learning.mjs';
import { buildSystemAiLearningContext } from '../tools/company-system-ai-learning-context.mjs';

const systemAiLearningSource=fs.readFileSync('tools/company-system-ai-learning.mjs','utf8');

test('ordinary System AI result promotes only after verified Primary-AI acceptance',()=>{
  const result=promoteVerifiedSystemAiLearning({
    systemAiInput:{tasks:[{
      id:'sys-accepted',status:'done',lastOutcome:'PRIMARY_AI_ACCEPTED',department:'infrastructure',
      goal:'repair workflow routing',responsibleFiles:['tools/router.mjs'],verificationCommands:['node --test qa/router.test.mjs'],
      evidence:['actions-run:1','verification:success','primary-ai-review:PASS','changed-file:tools/router.mjs','source-mutation-sha:abc123','learning-knowledge-id:CODE_PATTERN:prior-router']
    }]},
    experienceInput:{version:3,records:[]},libraryInput:{patterns:[]}
  });
  assert.equal(result.experienceAdded,1);
  assert.equal(result.patternsAdded,1);
  assert.equal(result.experience.records[0].authority,'VERIFIED_SYSTEM_AI_LEARNING');
  assert.equal(result.library.patterns[0].authority,'VERIFIED_SYSTEM_AI_CODE_PATTERN');
  assert.equal(result.queue.tasks[0].learningPromotion,'PROMOTED');
  assert.equal(result.knowledgeOutcomesAdded,1);
  assert.equal(result.knowledgePositiveApplications,1);
  assert.equal(result.mastery.knowledgeAttribution.entries['CODE_PATTERN:prior-router'].verifiedApplications,1);
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
  assert.match(workflow,/--state=\.vibe2\/learning-motor-state\.json/);
  assert.match(systemAiLearningSource,/SYSTEM_AI_LEARNING_KNOWLEDGE_OUTCOMES_ADDED/);
  assert.match(workflow,/vibe2-system-ai-learning\.log/);
});

test('System AI retrieval can reuse verified System AI experience and code pattern from Vibe memory',()=>{
  const context=buildSystemAiLearningContext({
    task:{id:'next-system-task',taskType:'system-ai',goal:'repair workflow queue orchestration failure',target:'system'},
    experienceInput:{records:[{
      id:'exp-system-ai',verified:true,reusable:true,engine:'system-ai',gameId:null,
      problem:'workflow queue orchestration failure',goal:'repair workflow queue orchestration',
      change:'verified changes: tools/router.mjs',outcome:'PASS',failureCause:null,
      reusablePatterns:['VERIFIED_SYSTEM_AI_ORCHESTRATION_SCOPED_EXECUTION_WITH_DETERMINISTIC_VERIFICATION'],
      avoidPatterns:['SYSTEM_AI_SELF_ACCEPTANCE']
    }]},
    codePatternsInput:{patterns:[{
      id:'pat-system-ai',verified:true,engine:'system-ai',gameId:null,system:'ORCHESTRATION',
      problem:'workflow queue orchestration',pattern:'VERIFIED_SYSTEM_AI_ORCHESTRATION_SCOPED_CHANGE_VERIFY_REVIEW_REUSE',
      tags:['system-ai','verified','ORCHESTRATION']
    }]},
    masteryInput:{}
  });
  assert.ok(context.exactKnowledgeIds.includes('EXPERIENCE:exp-system-ai'));
  assert.ok(context.exactKnowledgeIds.includes('CODE_PATTERN:pat-system-ai'));
  assert.match(context.guidance,/exp-system-ai/);
  assert.match(context.guidance,/pat-system-ai/);
  assert.equal(context.rawModelOutputIncluded,false);
  assert.equal(context.authorityExpanded,false);
});

test('marketing System AI retrieval does not inject unrelated recovery or security patterns solely by system engine',()=>{
  const context=buildSystemAiLearningContext({
    task:{
      id:'marketing-demo-pre-release-v1',
      department:'planning-growth-marketing',
      goal:'create organic marketing package and creator outreach angles',
      responsibleFiles:['company-learning/marketing/demo/latest.json']
    },
    experienceInput:{records:[]},
    codePatternsInput:{patterns:[
      {id:'recovery',verified:true,retrievalEligible:true,engine:'system',system:'EXACT_STAGE_RESUME',problem:'resume failed recovery stage',pattern:'repair regression',tags:['recovery']},
      {id:'security',verified:true,retrievalEligible:true,engine:'system',system:'WORKFLOW_INTEGRITY',problem:'security quarantine',pattern:'quarantine workflow',tags:['security']},
      {id:'marketing',verified:true,retrievalEligible:true,engine:'marketing',system:'MARKETING',problem:'organic marketing creator outreach',pattern:'validated organic outreach package',tags:['marketing','creator','organic']}
    ]},
    masteryInput:{}
  });
  assert.equal(context.resolvedTarget,'marketing');
  assert.ok(context.exactKnowledgeIds.includes('CODE_PATTERN:marketing'));
  assert.ok(!context.exactKnowledgeIds.includes('CODE_PATTERN:recovery'));
  assert.ok(!context.exactKnowledgeIds.includes('CODE_PATTERN:security'));
});

test('System AI game-source retrieval infers engine from assigned source files',()=>{
  const context=buildSystemAiLearningContext({
    task:{
      id:'web-repair',
      goal:'repair mobile input runtime bug',
      responsibleFiles:['web-games/demo/index.html']
    },
    experienceInput:{records:[]},
    codePatternsInput:{patterns:[
      {id:'web-input',verified:true,retrievalEligible:true,engine:'web',gameId:null,system:'MOBILE_INPUT',problem:'mobile input runtime bug',pattern:'verified pointer handling',tags:['mobile','input','runtime']},
      {id:'unity-input',verified:true,retrievalEligible:true,engine:'unity',gameId:null,system:'MOBILE_INPUT',problem:'mobile input runtime bug',pattern:'verified unity input handling',tags:['mobile','input','runtime']}
    ]},
    masteryInput:{}
  });
  assert.equal(context.resolvedTarget,'web');
  const webIndex=context.exactKnowledgeIds.indexOf('CODE_PATTERN:web-input');
  const unityIndex=context.exactKnowledgeIds.indexOf('CODE_PATTERN:unity-input');
  assert.ok(webIndex>=0);
  assert.ok(unityIndex<0||webIndex<unityIndex);
});

test('compound task classifies causal primary domain ahead of presentation secondary domains',()=>{
  const context=buildSystemAiLearningContext({
    task:{
      id:'roblox-sync-save-ui',
      target:'roblox',
      blocker:'runtime-failure:REPLICATION_DESYNC server client ownership state does not synchronize',
      goal:'fix multiplayer state synchronization, preserve save restore, and show synced state in UI',
      evidence:['failure-code:REPLICATION_DESYNC','multiplayer sync failed after server update'],
      responsibleFiles:['roblox-games/demo/src/ServerScriptService/State.server.lua','roblox-games/demo/src/StarterGui/State.client.lua']
    },
    experienceInput:{records:[]},
    codePatternsInput:{patterns:[
      {id:'replication',verified:true,retrievalEligible:true,engine:'roblox',system:'ROBLOX_REPLICATION',problem:'server client replication ownership desync',pattern:'server authoritative replicated state',tags:['roblox','replication','multiplayer']},
      {id:'ui',verified:true,retrievalEligible:true,engine:'roblox',system:'UI_STATE',problem:'ui state display',pattern:'render state after event',tags:['ui','state']},
      {id:'audio',verified:true,retrievalEligible:true,engine:'roblox',system:'AUDIO_FEEL',problem:'music transition',pattern:'crossfade audio',tags:['audio']}
    ]},
    masteryInput:{}
  });
  assert.ok(context.domainClassification.primary.includes('ROBLOX_REPLICATION')||context.domainClassification.primary.includes('ROBLOX_MULTIPLAYER'));
  assert.ok(context.domainClassification.secondary.includes('UI_STATE')||context.domainClassification.all.includes('UI_STATE'));
  assert.ok(context.exactKnowledgeIds.includes('CODE_PATTERN:replication'));
  assert.ok(!context.exactKnowledgeIds.includes('CODE_PATTERN:audio'));
});

test('primary domain outranks secondary domain even when secondary has similar keyword overlap',()=>{
  const context=buildSystemAiLearningContext({
    task:{
      id:'save-ui-runtime',
      target:'web',
      blocker:'save restore fails and loses player state',
      goal:'repair save restore and update UI after load',
      evidence:['failure-code:SAVE_RESTORE','restore state missing'],
      responsibleFiles:['web-games/demo/index.html']
    },
    experienceInput:{records:[]},
    codePatternsInput:{patterns:[
      {id:'save',verified:true,retrievalEligible:true,engine:'web',system:'SAVE',problem:'save restore state missing',pattern:'validate persisted schema before restore',tags:['save','restore','state']},
      {id:'ui',verified:true,retrievalEligible:true,engine:'web',system:'UI_STATE',problem:'update ui state after load',pattern:'render restored state',tags:['ui','state','load']}
    ]},
    masteryInput:{}
  });
  const save=context.exactKnowledgeIds.indexOf('CODE_PATTERN:save');
  const ui=context.exactKnowledgeIds.indexOf('CODE_PATTERN:ui');
  assert.ok(save>=0);
  assert.ok(ui<0||save<ui);
});

