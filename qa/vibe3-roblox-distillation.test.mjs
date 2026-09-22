// 파일명: qa/vibe3-roblox-distillation.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildInternalRobloxDistillation,
  normalizeExternalRobloxBlackBoxObservation,
  mergeRobloxDistillationLedger,
  extractRobloxSourcePatterns
} from '../tools/vibe3-roblox-distillation.mjs';
import { createRobloxVibe3LearningContext } from '../tools/vibe3-roblox-learning-context.mjs';

const REV='a'.repeat(40);
const ART='sha256:'+'b'.repeat(64);

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
  const ctx=createRobloxVibe3LearningContext({
    gameId:'same-game',profile:{genre:'Action'},playbooks:{taskTypes:{roblox:{checklist:['bind-current-source'],authority:'verified-task-playbook'},coding:{checklist:['run-qa']}}},
    distillation:ledger
  });
  assert.equal(ctx.applied,true);
  assert.ok(ctx.distilledPatterns.length>=1);
  assert.ok(ctx.distilledPrinciples.length>=1);
  assert.equal(ctx.rawSourceOutputAllowed,false);
  assert.equal(ctx.rawAssetOutputAllowed,false);
  assert.equal(ctx.externalExpressionCopyAllowed,false);
  assert.equal(ctx.freshQaRequiredForDistilledTransfer,true);
});
