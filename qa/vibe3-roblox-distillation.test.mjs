// 파일명: qa/vibe3-roblox-distillation.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  buildRobloxSourceCurriculum,
  buildRobloxSourceCoaching,
  buildInternalRobloxDistillation,
  normalizeExternalRobloxBlackBoxObservation,
  mergeRobloxDistillationLedger,
  extractRobloxSourcePatterns
} from '../tools/vibe3-roblox-distillation.mjs';
import { createRobloxVibe3LearningContext, existingRobloxGameLearningProfile } from '../tools/vibe3-roblox-learning-context.mjs';

const REV='a'.repeat(40);
const ART='sha256:'+'b'.repeat(64);

test('Roblox curriculum binds basic and studio lessons to real symbols and records missing topics honestly',()=>{
  const file='roblox-games/demo/server/Game.server.luau';
  const code='-- function createBotAvatar() is not executable\nlocal function bootstrapLobbyCharacter(player,character)\n return character\nend\nfunction BotAI.validateCharacterFoundation(p,c,sequence)\n return p.Character==c\nend';
  const c=buildRobloxSourceCurriculum({gameId:'demo',sourceFiles:{[file]:code}});
  assert.ok(c.lessons.some(x=>x.id==='BOOTSTRAP_SPAWN'));
  assert.ok(c.lessons.some(x=>x.id==='ASYNC_GENERATION_FENCE'&&x.level==='STUDIO'));
  assert.ok(c.missingTopics.includes('NPC_CONSTRUCTION'));
  assert.equal(c.runtimeVerified,false);assert.equal(c.weightTraining,false);assert.equal(c.rawCodeStored,false);
  for(const row of c.lessons){
    assert.equal(row.sourceReference.path,file);
    assert.equal(row.sourceReference.sha256,crypto.createHash('sha256').update(code).digest('hex'));
    assert.ok(row.application&&row.failureMode&&row.transferCheck);
  }
  assert.equal(JSON.stringify(c).includes('return p.Character==c'),false);
});

test('Roblox applied code coaching stays in current responsible files, ranks advanced work and caps excerpts',t=>{
  const cwd=fs.mkdtempSync(path.join(os.tmpdir(),'roblox-source-coaching-'));t.after(()=>fs.rmSync(cwd,{recursive:true,force:true}));
  const root='roblox-games/demo',file='server/Game.server.luau';fs.mkdirSync(path.join(cwd,root,'server'),{recursive:true});
  const source='local function bootstrapLobbyCharacter(p,c)\n return c\nend\nfunction BotAI.validateCharacterFoundation(p,c,sequence)\n'+Array(30).fill(' local detail="'+('x'.repeat(500))+'"').join('\n')+'\nend';
  fs.writeFileSync(path.join(cwd,root,file),source);
  const order={target:'roblox',gameId:'demo',source:{root},goal:'비동기 경쟁 sequence'};
  const result=buildRobloxSourceCoaching({cwd,order,responsibleFiles:[file]});
  assert.equal(result.evidence.retrieved,true);
  assert.equal(result.evidence.lessonIds[0],'ASYNC_GENERATION_FENCE');
  assert.ok(Buffer.byteLength(result.block)<10000);
  assert.match(result.block,/partial function/);
  assert.equal(result.evidence.applicationVerified,false);assert.equal(result.evidence.runtimeVerified,false);
  assert.equal(buildRobloxSourceCoaching({cwd,order,responsibleFiles:['../outside.luau']}).evidence.retrieved,false);
  assert.equal(buildRobloxSourceCoaching({cwd,order:{...order,source:{...order.source,internalAssetMotion:true}},responsibleFiles:[file]}).evidence.retrieved,false);
  const changed=source+'\n-- updated source';fs.writeFileSync(path.join(cwd,root,file),changed);
  assert.notEqual(buildRobloxSourceCoaching({cwd,order,responsibleFiles:[file]}).evidence.references[0].sha256,result.evidence.references[0].sha256);
});

test('verified Roblox distillation carries application and failure lessons without raw code or automatic promotion',()=>{
  const row=buildInternalRobloxDistillation({gameId:'demo',sourceRevision:REV,artifactIdentity:ART,runtimeEvidence:{runtimePassed:true},postRuntimeQaEvidence:{exactRevision:true,regressionPassed:true},source:{serverSource:'local remote=Instance.new("RemoteEvent")\nremote.OnServerEvent:Connect(function()end)\nlocal function bootstrapLobbyCharacter(p,c)\n return c\nend'}});
  assert.ok(row.principles.some(x=>x.startsWith('BOOTSTRAP_SPAWN:')&&x.includes('Avoid:')&&x.includes('Verify:')));
  assert.equal(row.sourceCurriculum.lessons[0].sourceReference.symbol,'bootstrapLobbyCharacter');
  assert.equal(row.sourceCurriculum.runtimeVerified,false);
  assert.equal(row.automaticCapabilityPromotion,false);
  assert.equal(JSON.stringify(row).includes('return c'),false);
});

test('internal Roblox distillation requires exact runtime and regression evidence and stores no raw code',()=>{
  const patterns=extractRobloxSourcePatterns({
    serverSource:'local RemoteEvent = Instance.new("RemoteEvent")\nRemoteEvent.OnServerEvent:Connect(function() end)\nlocal DataStoreService = game:GetService("DataStoreService")\nstore:GetAsync("x")\nstore:UpdateAsync("x", function() end)\nlocal Players=game:GetService("Players")\nRemoteEvent:FireAllClients()\nHumanoid:MoveTo(Vector3.zero)\nlocal damage=10',
    clientSource:'local UserInputService = game:GetService("UserInputService")\nbutton.Activated:Connect(function() end)\nlocal animator=Instance.new("Animator")\nlocal emitter=Instance.new("ParticleEmitter")\nlocal mesh=Instance.new("MeshPart")',
    sharedSource:'return {}'
  });
  assert.ok(patterns.includes('SERVER_AUTHORITATIVE_REMOTE_BOUNDARY'));
  assert.ok(patterns.includes('SAVE_DATASTORE_REJOIN'));
  assert.ok(patterns.includes('MOBILE_NATIVE_INPUT'));

  const row=buildInternalRobloxDistillation({
    gameId:'demo',sourceRevision:REV,artifactIdentity:ART,artifactRunId:123,
    runtimeEvidence:{runtimePassed:true},
    postRuntimeQaEvidence:{exactRevision:true,regressionPassed:true},
    source:{
      serverSource:'RemoteEvent.OnServerEvent:Connect(function() end)\nlocal damage=10',
      clientSource:'local UserInputService=game:GetService("UserInputService")',
      sharedSource:'local RemoteEvent=Instance.new("RemoteEvent")'
    }
  });
  assert.equal(row.verified,true);
  assert.equal(row.retrievalEligible,true);
  assert.equal(row.rawCodeStored,false);
  assert.equal(row.rawAssetStored,false);
  assert.equal(row.freshTransferQaRequired,true);
  assert.ok(row.principles.length>=1);
  assert.equal(JSON.stringify(row).includes('OnServerEvent:Connect(function() end)'),false);

  assert.throws(()=>buildInternalRobloxDistillation({
    gameId:'bad',sourceRevision:REV,artifactIdentity:ART,
    runtimeEvidence:{runtimePassed:true},postRuntimeQaEvidence:{exactRevision:false,regressionPassed:true},
    source:{serverSource:'RemoteEvent.OnServerEvent',clientSource:'UserInputService',sharedSource:'RemoteEvent'}
  }),/EXACT_RUNTIME_REVISION/);
});

test('external Roblox references are black-box advisory only and reject extraction',()=>{
  const input={
    sourceKind:'external-roblox-runtime-reference',authority:'PRACTICE_ONLY',practiceOnly:true,runtimePromotionAllowed:false,
    project:'external-roblox-cartoon-reference',sourceRevision:'observation-run-7',
    provenance:{observationKind:'BLACK_BOX_RUNTIME_ONLY',codeExtracted:false,binaryRedistributed:false,assetExtracted:false},
    qa:{runtime:'PASS',teacherReview:'PASS'},
    observations:['large readable silhouette','attack anticipation is visible'],
    patterns:['CARTOON_SILHOUETTE','COMBAT_FEEDBACK'],
    principles:['Use readable silhouette separation at normal gameplay camera distance.'],
    tags:['cartoon','combat']
  };
  const row=normalizeExternalRobloxBlackBoxObservation(input);
  assert.equal(row.authority,'PRACTICE_ONLY');
  assert.equal(row.advisoryOnly,true);
  assert.equal(row.verified,false);
  assert.equal(row.codeExtracted,false);
  assert.equal(row.assetExtracted,false);
  assert.equal(row.freshTransferQaRequired,true);
  assert.throws(()=>normalizeExternalRobloxBlackBoxObservation({
    ...input,provenance:{...input.provenance,codeExtracted:true}
  }),/EXTRACTION_BOUNDARY/);
});

test('Roblox learning context consumes distilled principles without granting pass or copy authority',()=>{
  const internal=buildInternalRobloxDistillation({
    gameId:'same-game',sourceRevision:REV,artifactIdentity:ART,
    runtimeEvidence:{runtimePassed:true},postRuntimeQaEvidence:{exactRevision:true,regressionPassed:true},
    source:{serverSource:'local r=Instance.new("RemoteEvent")\nr.OnServerEvent:Connect(function() end)\nlocal damage=5',clientSource:'UserInputService',sharedSource:''}
  });
  const external=normalizeExternalRobloxBlackBoxObservation({
    sourceKind:'external-roblox-runtime-reference',authority:'PRACTICE_ONLY',practiceOnly:true,runtimePromotionAllowed:false,
    project:'external-roblox-style',sourceRevision:'obs-1',
    provenance:{observationKind:'BLACK_BOX_RUNTIME_ONLY',codeExtracted:false,binaryRedistributed:false,assetExtracted:false},
    qa:{runtime:'PASS',teacherReview:'PASS'},
    observations:['combat attack feedback readable'],patterns:['COMBAT_FEEDBACK'],
    principles:['Keep attack anticipation and impact visually distinct.'],tags:['combat']
  });
  const ledger=mergeRobloxDistillationLedger({},[internal,external]);
  const verifiedReuse=[{
    id:'external-black-box-verified-game-run-1',
    project:'verified-commercial-game',
    sourceRevision:'sha256:'+'c'.repeat(64),
    distilledApplicationPrinciples:['Keep first playable entry distinct and bind input to immediate local feedback.'],
    distilledAvoidancePrinciples:['Do not copy distinctive commercial UI expression.'],
    distilledLearningUseAllowed:['menu flow timing','local motion feedback']
  }];
  const ctx=createRobloxVibe3LearningContext({
    gameId:'same-game',profile:{genre:'Action'},playbooks:{taskTypes:{
      roblox:{checklist:['bind-current-source'],authority:'verified-task-playbook',reuse:verifiedReuse},
      coding:{checklist:['run-qa'],authority:'verified-task-playbook',reuse:verifiedReuse}
    }},
    distillation:ledger
  });
  assert.equal(ctx.applied,true);
  assert.ok(ctx.distilledPatterns.length>=1);
  assert.ok(ctx.distilledPrinciples.length>=1);
  assert.equal(ctx.rawSourceOutputAllowed,false);
  assert.equal(ctx.rawAssetOutputAllowed,false);
  assert.equal(ctx.externalExpressionCopyAllowed,false);
  assert.equal(ctx.freshQaRequiredForDistilledTransfer,true);
  assert.equal(ctx.verifiedExternalLearningRetrievedCount,1);
  assert.equal(ctx.verifiedExternalLearningAppliedCount,1);
  assert.equal(ctx.verifiedExternalLearningCoveragePct,100);
  assert.equal(ctx.verifiedExternalDistilledContentComplete,true);
  assert.ok(ctx.verifiedExternalLearningPrinciples.includes('Keep first playable entry distinct and bind input to immediate local feedback.'));
});

test('Roblox learning context refuses id-only verified external playbook coverage',()=>{
  const ctx=createRobloxVibe3LearningContext({
    gameId:'id-only',profile:{genre:'Action'},playbooks:{taskTypes:{
      roblox:{checklist:['bind-current-source'],authority:'verified-task-playbook',reuse:[{id:'external-black-box-id-only',project:'x',sourceRevision:'sha256:x'}]},
      coding:{checklist:['run-qa'],authority:'verified-task-playbook',reuse:[{id:'external-black-box-id-only',project:'x',sourceRevision:'sha256:x'}]}
    }},
    distillation:{records:[]}
  });
  assert.equal(ctx.applied,false);
  assert.equal(ctx.verifiedExternalLearningRetrievedCount,1);
  assert.equal(ctx.verifiedExternalLearningAppliedCount,0);
  assert.equal(ctx.verifiedExternalLearningCoveragePct,0);
  assert.equal(ctx.verifiedExternalDistilledContentComplete,false);
});

test('all portable APK gameplay principles adapt across Roblox puzzle, economy, and survival games',()=>{
  const ids=[
    'compact-tactical-state-with-immediate-feedback','persistent-primary-rpg-navigation',
    'danger-and-level-gating-visible-before-commitment','touch-look-produces-immediate-spatial-feedback',
    'persistent-core-state-around-world-view','movement-needs-immediate-visible-response',
    'persistent-contextual-action-controls','immediate-spatially-anchored-input-feedback',
    'touch-instruction-near-first-play-state'
  ];
  const reuse=[{id:'external-black-box-portable',distilledApplicationPrinciples:[
    ...ids.map(id=>`id=${id}; scope=mobile-gameplay; lesson=visible game state; apply=${id}`),
    'id=semantic-gameplay-input-plus-survival; scope=qa-evidence; lesson=process survival; apply=verify Android runtime'
  ]}];
  const playbooks={taskTypes:{roblox:{authority:'verified-task-playbook',reuse},coding:{authority:'verified-task-playbook',reuse}}};
  const variants=new Set(),ruleMappings=new Set(),explicitMoods=new Set(),explicitFingerprints=new Set();
  const cases=[
    {gameId:'seed-puzzle-chromatic-cascade',kind:'PUZZLE',style:'painted-board',concept:'garden-puzzle',mood:'calm-garden'},
    {gameId:'amusement-tycoon',kind:'ECONOMY',style:'miniature-park',concept:'festival-park',mood:'cheerful-festival'},
    {gameId:'survival',kind:'SURVIVAL',style:'textured-wilderness',concept:'night-forest',mood:'quiet-night'}
  ];
  for(const {gameId,kind,style,concept,mood} of cases){
    const profile=existingRobloxGameLearningProfile(gameId);
    const result=createRobloxVibe3LearningContext({gameId,profile,playbooks});
    assert.equal(result.applied,true,gameId);
    assert.equal(result.gameSpecificSemanticMappings.length,ids.length,gameId);
    assert.equal(result.coreKind,kind,gameId);
    assert.ok(result.gameSpecificSemanticMappings.every(row=>row.coreKind===kind),gameId);
    variants.add(result.semanticVariant);
    ruleMappings.add(JSON.stringify(result.gameSpecificSemanticMappings.map(row=>row.mapping)));
    assert.deepEqual(result.semanticMood,{id:'PRESERVE_AUTHORED_PRESENTATION',saturation:0,contrast:0,brightness:0},gameId);
    assert.equal(result.verifiedExternalValidationOnlyPrincipleCount,1,gameId);
    assert.deepEqual(new Set(result.gameSpecificSemanticMappings.map(row=>row.principleId)),new Set(ids));
    assert.equal(result.allRetrievedPrinciplesHaveExplicitDisposition,true);

    // 표현은 명시된 디자인축에서만 가져오며 장르의 플레이 규칙은 그대로다.
    const locked=createRobloxVibe3LearningContext({gameId,playbooks,profile:{...profile,designAxes:{
      genre:{id:profile.genre,subgenre:profile.subgenre,rules:[]},
      style:{id:style,visual:[],motion:[]},concept:{id:concept,world:[],mood:[mood]}
    },styleLock:{id:style,colorGrade:{saturation:0.08,contrast:0.04,brightness:0}}}});
    assert.equal(locked.designAxes.genre.id,profile.genre);
    assert.equal(locked.designAxes.style.id,style);
    assert.equal(locked.designAxes.concept.id,concept);
    assert.deepEqual(locked.semanticMood,{id:mood,saturation:0.08,contrast:0.04,brightness:0});
    assert.equal(locked.semanticVariant,result.semanticVariant);
    assert.deepEqual(locked.gameSpecificSemanticMappings,result.gameSpecificSemanticMappings);
    assert.notEqual(locked.semanticMappingFingerprint,result.semanticMappingFingerprint);
    explicitMoods.add(locked.semanticMood.id);
    explicitFingerprints.add(locked.semanticMappingFingerprint);
  }
  assert.equal(variants.size,3);
  assert.equal(ruleMappings.size,3);
  assert.equal(explicitMoods.size,3);
  assert.equal(explicitFingerprints.size,3);
});
