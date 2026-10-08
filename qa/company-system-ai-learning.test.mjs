// 파일명: qa/company-system-ai-learning.test.mjs
// 임포트: 기존 System AI 검증 계약
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { promoteVerifiedSystemAiLearning } from '../tools/company-system-ai-learning.mjs';
import { buildSystemAiLearningContext } from '../tools/company-system-ai-learning-context.mjs';
import { buildExternalAiLearningFeed } from '../tools/company-system-ai-external-learning-feed.mjs';

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
  const promoted=promoteVerifiedSystemAiLearning({
    systemAiInput:{tasks:[{
      id:'sys-router',status:'done',lastOutcome:'PRIMARY_AI_ACCEPTED',department:'infrastructure',
      goal:'repair workflow queue orchestration failure',responsibleFiles:['tools/router.mjs'],
      verificationCommands:['node --test qa/router.test.mjs'],
      evidence:['actions-run:1','verification:success','primary-ai-review:PASS','changed-file:tools/router.mjs','source-mutation-sha:abc123']
    }]},
    experienceInput:{records:[]},libraryInput:{patterns:[]}
  });
  assert.equal(promoted.experienceAdded,1);
  assert.equal(promoted.patternsAdded,1);
  const experienceId=promoted.experience.records[0].id;
  const patternId=promoted.library.patterns[0].id;
  const context=buildSystemAiLearningContext({
    task:{id:'next-system-task',taskType:'system-ai',goal:'repair workflow queue orchestration failure',target:'system'},
    experienceInput:promoted.experience,
    codePatternsInput:promoted.library,
    masteryInput:{}
  });
  assert.ok(context.exactKnowledgeIds.includes('EXPERIENCE:'+experienceId));
  assert.ok(context.exactKnowledgeIds.includes('CODE_PATTERN:'+patternId));
  assert.ok(context.guidance.includes(experienceId));
  assert.ok(context.guidance.includes(patternId));
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

test('bottleneck System AI receives policy-grounded advanced causal optimization playbook',()=>{
  const policy=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
  const context=buildSystemAiLearningContext({
    task:{
      id:'sys-bottleneck-runner-queue-v1',
      taskType:'bottleneck-repair',
      goal:'remove runner queue serialization and fan-in wait without weakening exact duplicate protection',
      blocker:'runner-capacity-or-startup-serialization',
      failureStage:'WORKFLOW_RESERVATION',
      failureSignature:'RUNNER_QUEUE_SERIALIZATION',
      responsibleFiles:['tools/vibe2-queue-control.mjs']
    },
    experienceInput:{records:[]},
    codePatternsInput:{patterns:[]},
    masteryInput:{},
    policyInput:policy
  });
  assert.equal(context.bottleneckPlaybook.applied,true);
  assert.equal(context.bottleneckPlaybook.verifiedPolicyBound,true);
  assert.equal(context.bottleneckPlaybook.authority,'company-learning/platform-release-roadmap.json#aiExecutionEfficiency.systemAiEvolution');
  const ids=context.bottleneckPlaybook.methods.map(row=>row.id);
  for(const required of [
    'CAUSAL_WAIT_GRAPH','LOGICAL_PHYSICAL_CAPACITY_SPLIT','MINIMUM_LOCK_SCOPE','STAGE_SCOPED_EXACT_DEDUPE',
    'CONTROL_PLANE_ISOLATION','EVENT_DRIVEN_REFILL','CHECKPOINT_PRESERVING_HANDOFF','REPRESENTATIVE_CANARY_COHORT',
    'STALE_QA_TRIANGULATION','MULTI_HYPOTHESIS_CAUSAL_REPAIR','WORK_CONSERVING_DISJOINT_PARALLELISM',
    'SPARE_CAPACITY_HEDGING','CAUSE_SCOPED_BACKPRESSURE','OBSERVABILITY_TO_VERIFIED_LEARNING'
  ])assert.ok(ids.includes(required),required);
  assert.match(context.guidance,/POLICY-GROUNDED ADVANCED BOTTLENECK PLAYBOOK/);
  assert.match(context.guidance,/STALE_QA_TRIANGULATION/);
  assert.match(context.guidance,/MULTI_HYPOTHESIS_CAUSAL_REPAIR/);
  assert.equal(context.rawModelOutputIncluded,false);
  assert.equal(context.advisoryOnly,true);
  assert.equal(context.authorityExpanded,false);
});

test('ordinary non-bottleneck System AI task does not receive bottleneck playbook',()=>{
  const policy=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
  const context=buildSystemAiLearningContext({
    task:{id:'ordinary-copy',goal:'update one ordinary content string',responsibleFiles:['web-games/demo/index.html']},
    experienceInput:{records:[]},codePatternsInput:{patterns:[]},masteryInput:{},policyInput:policy
  });
  assert.equal(context.bottleneckPlaybook.applied,false);
  assert.deepEqual(context.bottleneckPlaybook.methods,[]);
  assert.ok(!context.guidance.includes('POLICY-GROUNDED ADVANCED BOTTLENECK PLAYBOOK'));
});



test('verified external AI graphics findings distill into visual rig motion material vfx and camera domains',()=>{
  const result=buildExternalAiLearningFeed({tasks:[{
    id:'graphics-multimodal-review',status:'done',lastOutcome:'PRIMARY_AI_ACCEPTED',
    department:'graphics',taskType:'graphics-review',target:'roblox',gameId:'graphics-demo',
    goal:'review silhouette aesthetics rig joints skin weights walk gait animation timing anticipation settle foot contact secondary motion material roughness lighting vfx particles camera shake mobile readability',
    responsibleFiles:['roblox-games/graphics-demo/shared/VisualStyle.luau'],
    evidence:[
      'verification:success','primary-ai-review:PASS',
      'changed-file:roblox-games/graphics-demo/shared/VisualStyle.luau',
      'external-ai-raw-output-sha256:'+'a'.repeat(64),
      'external-ai-model:multimodal-critic',
      'actions-run:graphics-review-1'
    ]
  }]});
  assert.equal(result.records.length,1);
  const row=result.records[0];
  for(const domain of ['ASSET_PRODUCTION','ASSET_ADAPTATION','LIVING_MOTION','ANIMATION_FEEL','VFX','CAMERA_LANGUAGE','VISUAL_IDENTITY'])assert.ok(row.domains.includes(domain),domain);
  assert.ok(row.distilledPatterns.some(pattern=>pattern.includes('target-runtime before/after evidence')));
  assert.equal(result.rawOutputStored,false);
  assert.equal(result.verifiedOnly,true);
});

test('System AI Roblox coding task consumes verified Roblox cloud coding distillation from canonical main knowledge',()=>{
  const external=JSON.parse(fs.readFileSync('.vibe2/external-ai-distilled-knowledge.json','utf8'));
  const context=buildSystemAiLearningContext({
    task:{
      id:'roblox-remote-datastore-repair',
      target:'roblox',
      taskType:'bottleneck-repair',
      goal:'repair RemoteEvent server authority replay idempotency replication datastore rejoin and mobile UI state',
      blocker:'runtime-failure:REPLICATION_DESYNC',
      responsibleFiles:['roblox-games/demo/src/ServerScriptService/State.server.lua','roblox-games/demo/src/StarterGui/State.client.lua']
    },
    experienceInput:{records:[]},
    codePatternsInput:{patterns:[]},
    masteryInput:{},
    externalAiDistilledInput:external
  });
  const id='EXTERNAL_AI_DISTILLED:external-ai-distilled:openai-roblox-cloud-coding-v1';
  assert.equal(context.resolvedTarget,'roblox');
  assert.ok(context.exactKnowledgeIds.includes(id));
  assert.match(context.guidance,/openai-roblox-cloud-coding-v1/);
  assert.match(context.guidance,/authoritative gameplay state on the server/i);
  assert.equal(context.rawModelOutputIncluded,false);
  assert.equal(context.advisoryOnly,true);
  assert.equal(context.authorityExpanded,false);
});

test('System AI consumes advanced Roblox Luau engine systems distillation without expanding authority',()=>{
  const external=JSON.parse(fs.readFileSync('.vibe2/external-ai-distilled-knowledge.json','utf8'));
  const context=buildSystemAiLearningContext({
    task:{
      id:'roblox-parallel-physics-streaming-repair',
      target:'roblox',
      goal:'optimize Actor Parallel Luau physics network ownership UnreliableRemoteEvent streaming UpdateAsync strict types and profiler hotspots',
      responsibleFiles:['roblox-games/demo/src/ServerScriptService/Simulation.server.lua','roblox-games/demo/src/ReplicatedStorage/Protocol.luau']
    },
    experienceInput:{records:[]},
    codePatternsInput:{patterns:[]},
    masteryInput:{},
    externalAiDistilledInput:external
  });
  const id='EXTERNAL_AI_DISTILLED:external-ai-distilled:openai-roblox-engine-systems-v2';
  assert.equal(context.resolvedTarget,'roblox');
  assert.ok(context.exactKnowledgeIds.includes(id));
  assert.match(context.guidance,/openai-roblox-engine-systems-v2/);
  assert.match(context.guidance,/separate Luau VM/i);
  assert.match(context.guidance,/Network ownership is a performance mechanism/i);
  assert.equal(context.rawModelOutputIncluded,false);
  assert.equal(context.advisoryOnly,true);
  assert.equal(context.authorityExpanded,false);
});

test('System AI consumes Roblox distributed services v3 without authority expansion',()=>{
  const external=JSON.parse(fs.readFileSync('.vibe2/external-ai-distilled-knowledge.json','utf8'));
  const context=buildSystemAiLearningContext({
    task:{
      id:'roblox-cross-server-services-repair',
      target:'roblox',
      goal:'repair MemoryStore queue matchmaking MessagingService cross-server signals Pathfinding blocked routes streaming and CollectionService tagged lifecycle',
      responsibleFiles:['roblox-games/demo/src/ServerScriptService/Matchmaking.server.lua','roblox-games/demo/src/ServerScriptService/Npc.server.lua']
    },
    experienceInput:{records:[]},codePatternsInput:{patterns:[]},masteryInput:{},externalAiDistilledInput:external
  });
  const id='EXTERNAL_AI_DISTILLED:external-ai-distilled:openai-roblox-distributed-services-v3';
  assert.equal(context.resolvedTarget,'roblox');
  assert.ok(context.exactKnowledgeIds.includes(id));
  assert.match(context.guidance,/openai-roblox-distributed-services-v3/);
  assert.match(context.guidance,/MemoryStore queue items can reappear/i);
  assert.match(context.guidance,/Do not make MessagingService delivery a prerequisite/i);
  assert.equal(context.rawModelOutputIncluded,false);
  assert.equal(context.advisoryOnly,true);
  assert.equal(context.authorityExpanded,false);
});

test('System AI engine-specific distilled knowledge does not leak Roblox coding guidance into Unity work',()=>{
  const external=JSON.parse(fs.readFileSync('.vibe2/external-ai-distilled-knowledge.json','utf8'));
  const context=buildSystemAiLearningContext({
    task:{
      id:'unity-save-replication-repair',
      target:'unity',
      goal:'repair server replication save retry and mobile UI state',
      responsibleFiles:['unity-games/demo/Assets/Scripts/State.cs']
    },
    experienceInput:{records:[]},
    codePatternsInput:{patterns:[]},
    masteryInput:{},
    externalAiDistilledInput:external
  });
  assert.equal(context.resolvedTarget,'unity');
  assert.ok(!context.exactKnowledgeIds.includes('EXTERNAL_AI_DISTILLED:external-ai-distilled:openai-roblox-cloud-coding-v1'));
  assert.ok(!context.exactKnowledgeIds.includes('EXTERNAL_AI_DISTILLED:external-ai-distilled:openai-roblox-engine-systems-v2'));
  assert.ok(!context.exactKnowledgeIds.includes('EXTERNAL_AI_DISTILLED:external-ai-distilled:openai-roblox-distributed-services-v3'));
  assert.ok(!context.guidance.includes('openai-roblox-cloud-coding-v1'));
  assert.ok(!context.guidance.includes('openai-roblox-engine-systems-v2'));
  assert.ok(!context.guidance.includes('openai-roblox-distributed-services-v3'));
});

test('System AI workflow binds canonical distilled advisory knowledge into every supervised worker context',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-system-ai-workers.yml','utf8');
  assert.match(workflow,/test -s \.vibe2\/external-ai-distilled-knowledge\.json/);
  assert.match(workflow,/--external-ai-distilled=\.vibe2\/external-ai-distilled-knowledge\.json/);
  assert.match(workflow,/--learning-context=\/tmp\/system-ai-learning-context\.json/);
});

/* ── 기존 14개 방법 재사용 및 검증된 F0~F9 수리 지식만 학습 ── */
test('System AI learns two hypotheses for exact Roblox failures without inventing a passed floor',()=>{
  const policy=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
  for(const [signature,stage] of [
    ['ROBLOX_F0_SOURCE_PREFLIGHT_FAILED','F0_SOURCE_PREFLIGHT'],
    ['ROBLOX_RUNTIME_CANDIDATE_DEPLOY_PENDING','PRIVATE_RUNTIME_CANDIDATE_DEPLOY'],
    ['ROBLOX_OPEN_CLOUD_ENGINE_PROBE_TRANSIENT_FAILURE','TARGET_PLATFORM_RUNTIME_FOUNDATION'],
    ['roblox-package-asset-binding-failed','TARGET_PLATFORM_BUILD_OR_PACKAGE']
  ]){
    const context=buildSystemAiLearningContext({
      task:{id:'floor-'+signature,taskType:'bottleneck-repair',gameId:'demo',target:'roblox',
        goal:'repair exact game F0-F9 stage',failureSignature:signature,responsibleFiles:['tools/company-development-roblox-build-preflight.mjs']},
      policyInput:policy,experienceInput:{records:[]},codePatternsInput:{patterns:[]},masteryInput:{}
    });
    assert.equal(context.bottleneckPlaybook.methods.length,14);
    assert.equal(context.floorRecovery.stage,stage);
    assert.equal(context.floorRecovery.hypotheses.length,2);
    assert.equal(context.floorRecovery.independentVerificationRequired,true);
    assert.equal(context.floorRecovery.verifiedSuccessPromotionOnly,true);
    assert.equal(context.authorityExpanded,false);
    assert.match(context.guidance,/EXACT F0-F9 RECOVERY/);
  }
});

test('System AI promotes failure-specific successful repair only after independently accepted evidence',()=>{
  const task={
    id:'floor-verified',taskType:'bottleneck-repair',department:'engineering',
    status:'done',lastOutcome:'PRIMARY_AI_ACCEPTED',
    goal:'repair Roblox exact source F0 preflight',failureStage:'F0_SOURCE_PREFLIGHT',
    failureSignature:'ROBLOX_F0_SOURCE_PREFLIGHT_FAILED',
    failedStrategyFingerprints:['a'.repeat(64)],
    responsibleFiles:['tools/company-development-roblox-build-preflight.mjs'],
    verificationCommands:['node --test qa/company-system-ai-evolution.test.mjs'],
    evidence:['primary-ai-review:PASS','verification:success','actions-run:193',
      'changed-file:tools/company-development-roblox-build-preflight.mjs','source-mutation-sha:abcdef0123']
  };
  const pending=promoteVerifiedSystemAiLearning({
    systemAiInput:{tasks:[{...task,status:'awaiting-supervisor',lastOutcome:'PASS',evidence:task.evidence.filter(x=>x!=='primary-ai-review:PASS')}]},
    experienceInput:{records:[]},libraryInput:{patterns:[]},masteryInput:{}
  });
  assert.equal(pending.experienceAdded,0);
  assert.equal(pending.patternsAdded,0);
  const verified=promoteVerifiedSystemAiLearning({
    systemAiInput:{tasks:[task]},experienceInput:{records:[]},libraryInput:{patterns:[]},masteryInput:{}
  });
  assert.equal(verified.experienceAdded,1);
  assert.equal(verified.patternsAdded,1);
  assert.match(verified.experience.records[0].problem,/verified-stage:F0_SOURCE_PREFLIGHT/);
  assert.match(verified.experience.records[0].problem,/verified-signature:ROBLOX_F0_SOURCE_PREFLIGHT_FAILED/);
  assert.ok(verified.experience.records[0].avoidPatterns.includes('FAILED_STRATEGY_SHA256_'+'a'.repeat(64)));
  assert.ok(verified.library.patterns[0].tags.includes('f0_source_preflight'));
  assert.equal(verified.queue.tasks[0].learningPromotion,'PROMOTED');
});
