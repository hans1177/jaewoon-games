import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  ROBLOX_PLATFORM_POLICY,
  createRobloxPlatformContract,
  validateRobloxSourcePath,
  assembleRobloxTechnicalEvidence,
  validateRobloxReleaseEvidence,
  createRobloxPlacePublishPlan,createRobloxRuntimeCandidatePublishPlan,
  publishRobloxPlace,
} from '../tools/vibe3-roblox-platform.mjs';

const contract=createRobloxPlatformContract();
assert.equal(contract.platform,'ROBLOX');
assert.equal(contract.roadmapPhase,'ROBLOX_UNITY_CONCURRENT_RELEASE_EXPERIENCE');
assert.equal(contract.parallelPipeline,false);
assert.equal(contract.learning.useExistingCanonicalDistillation,true);
assert.equal(contract.publishing.liveExecutionRequiresExplicitFlag,true);
assert.equal(contract.publishing.placeFileMustRemainUnderSourceRoot,true);
assert.equal(contract.cookieAuthAllowed,false);
assert.deepEqual([...ROBLOX_PLATFORM_POLICY.positiveExperienceRequires],['VERIFIED_WINNER','RUNTIME_PASS','INDEPENDENT_QA_PASS','REGRESSION_PASS','PROTECTED_STATE_PRESERVED','EXACT_REVISION']);

assert.equal(validateRobloxSourcePath('roblox-games/pilot/src/ServerScriptService/Main.server.luau').pass,true);
assert.equal(validateRobloxSourcePath('roblox-games/pilot/place.rbxlx').pass,true);
assert.equal(validateRobloxSourcePath('unity-games/pilot/Main.luau').pass,false);
assert.equal(validateRobloxSourcePath('roblox-games/pilot/readme.md').pass,false);

const evidence={
  sourceRevision:'abcdef1234567890',
  buildOrPackagePassed:true,
  artifactIdentity:'sha256:test-place-artifact',
  luauOrSourceValidationPassed:true,
  actualRuntimeEvidence:true,
  runtimeFoundationPassed:true,
  runtimePassed:true,
  serverClientBoundaryPassed:true,
  saveExists:false,
  datastoreRejoinPassed:false,
  mobileControlUiPassed:true,
  multiplayerApplicable:false,
  multiplayerQaPassed:false,
  independentQaPassed:true,
  regressionPassed:true,
  protectedStatePreserved:true,
  exactRevision:true,
};
const gate=validateRobloxReleaseEvidence(evidence,'abcdef1234567890');
assert.equal(gate.pass,true);
assert.equal(gate.browserQa,'NOT_APPLICABLE');

const assembled=assembleRobloxTechnicalEvidence({
  build:{
    state:'PASS',
    sourceRevision:'abcdef1234567890',
    sourceFingerprint:'source-fingerprint',
    artifactIdentity:'sha256:test-place-artifact',
    luauOrSourceValidationPassed:true,
  },
  runtime:{
    state:'PASS',
    sourceRevision:'abcdef1234567890',
    artifactIdentity:'sha256:test-place-artifact',
    actualRuntimeEvidence:true,
    actualPlatformRuntime:true,
    runtimeFoundationPassed:true,
    runtimePassed:true,
    serverClientBoundaryPassed:true,
    saveExists:false,
    mobileControlUiPassed:true,
    multiplayerApplicable:false,
  },
  independent:{
    state:'PASS',
    sourceRevision:'abcdef1234567890',
    artifactIdentity:'sha256:test-place-artifact',
    independentQaPassed:true,
  },
  regression:{
    state:'PASS',
    sourceRevision:'abcdef1234567890',
    artifactIdentity:'sha256:test-place-artifact',
    regressionPassed:true,
    protectedStatePreserved:true,
    exactRevision:true,
  },
});
assert.equal(assembled.state,'PASS');
assert.equal(assembled.pass,true);
assert.equal(assembled.validated,true);
assert.equal(assembled.sameRevision,true);
assert.equal(assembled.sameArtifact,true);
assert.deepEqual(assembled.blockedReasons,[]);
assert.equal(validateRobloxReleaseEvidence(assembled,'abcdef1234567890').pass,true);

const artifactMismatch=assembleRobloxTechnicalEvidence({
  build:{state:'PASS',sourceRevision:'abcdef1234567890',artifactIdentity:'artifact-a',luauOrSourceValidationPassed:true},
  runtime:{state:'PASS',sourceRevision:'abcdef1234567890',artifactIdentity:'artifact-b',actualRuntimeEvidence:true,runtimeFoundationPassed:true,runtimePassed:true,serverClientBoundaryPassed:true,mobileControlUiPassed:true},
  independent:{state:'PASS',sourceRevision:'abcdef1234567890',artifactIdentity:'artifact-a',independentQaPassed:true},
  regression:{state:'PASS',sourceRevision:'abcdef1234567890',artifactIdentity:'artifact-a',regressionPassed:true,protectedStatePreserved:true,exactRevision:true},
});
assert.equal(artifactMismatch.state,'FAIL');
assert.equal(artifactMismatch.sameArtifact,false);
assert(artifactMismatch.blockedReasons.includes('exact-revision-unproven'));

const revisionMismatch=assembleRobloxTechnicalEvidence({
  build:{state:'PASS',sourceRevision:'abcdef1234567890',artifactIdentity:'artifact-a',luauOrSourceValidationPassed:true},
  runtime:{state:'PASS',sourceRevision:'deadbeef12345678',artifactIdentity:'artifact-a',actualRuntimeEvidence:true,runtimeFoundationPassed:true,runtimePassed:true,serverClientBoundaryPassed:true,mobileControlUiPassed:true},
  independent:{state:'PASS',sourceRevision:'abcdef1234567890',artifactIdentity:'artifact-a',independentQaPassed:true},
  regression:{state:'PASS',sourceRevision:'abcdef1234567890',artifactIdentity:'artifact-a',regressionPassed:true,protectedStatePreserved:true,exactRevision:true},
});
assert.equal(revisionMismatch.state,'FAIL');
assert.equal(revisionMismatch.sameRevision,false);
assert(revisionMismatch.blockedReasons.includes('exact-revision-unproven'));

const saveEvidence={...evidence,saveExists:true,datastoreRejoinPassed:true};
assert.equal(validateRobloxReleaseEvidence(saveEvidence,'abcdef1234567890').pass,true);
const missingSaveRejoin={...saveEvidence,datastoreRejoinPassed:false};
assert(validateRobloxReleaseEvidence(missingSaveRejoin,'abcdef1234567890').blockedReasons.includes('datastore-rejoin-not-passed'));

const multiplayerEvidence={...evidence,multiplayerApplicable:true,multiplayerQaPassed:true};
assert.equal(validateRobloxReleaseEvidence(multiplayerEvidence,'abcdef1234567890').pass,true);
const missingMultiplayerQa={...multiplayerEvidence,multiplayerQaPassed:false};
assert(validateRobloxReleaseEvidence(missingMultiplayerQa,'abcdef1234567890').blockedReasons.includes('multiplayer-qa-not-passed'));

for(const [field,reason] of [
  ['buildOrPackagePassed','build-or-package-not-passed'],
  ['luauOrSourceValidationPassed','luau-or-source-validation-not-passed'],
  ['runtimePassed','runtime-not-passed'],
  ['serverClientBoundaryPassed','server-client-boundary-not-passed'],
  ['mobileControlUiPassed','mobile-control-ui-not-passed'],
  ['independentQaPassed','independent-qa-not-passed'],
  ['regressionPassed','regression-not-passed'],
  ['protectedStatePreserved','protected-state-unproven'],
  ['exactRevision','exact-revision-unproven'],
]){
  const bad={...evidence,[field]:false};
  assert(validateRobloxReleaseEvidence(bad,'abcdef1234567890').blockedReasons.includes(reason));
}
assert(validateRobloxReleaseEvidence({...evidence,artifactIdentity:''},'abcdef1234567890').blockedReasons.includes('artifact-identity-missing'));

const xmlPlan=createRobloxPlacePublishPlan({placeFile:'roblox-games/pilot/place.rbxlx',universeId:'123456',placeId:'654321',sourceRevision:'abcdef1234567890',evidence});
assert.equal(xmlPlan.executionReady,true);
assert.equal(xmlPlan.contentType,'application/xml');
assert.equal(xmlPlan.endpoint,'https://apis.roblox.com/universes/v1/123456/places/654321/versions?versionType=Published');
assert.equal(xmlPlan.auth.secretIncluded,false);
assert.equal(xmlPlan.noCookieAuth,true);
assert(xmlPlan.publishingLimitations.includes('EditableImage'));
assert(xmlPlan.publishingLimitations.includes('EditableMesh'));
assert(xmlPlan.publishingLimitations.includes('PartOperation'));
assert(xmlPlan.publishingLimitations.includes('SurfaceAppearance'));
assert(xmlPlan.publishingLimitations.includes('BaseWrap'));

const binaryPlan=createRobloxPlacePublishPlan({placeFile:'roblox-games/pilot/place.rbxl',universeId:'123456',placeId:'654321',sourceRevision:'abcdef1234567890',evidence});
assert.equal(binaryPlan.executionReady,true);
assert.equal(binaryPlan.contentType,'application/octet-stream');

const outsideRoot=createRobloxPlacePublishPlan({placeFile:'tmp/place.rbxlx',universeId:'123456',placeId:'654321',sourceRevision:'abcdef1234567890',evidence});
assert.equal(outsideRoot.executionReady,false);
assert(outsideRoot.blockedReasons.includes('place-file-outside-roblox-root'));

const badEvidence={...evidence,runtimePassed:false};
const blocked=createRobloxPlacePublishPlan({placeFile:'roblox-games/pilot/place.rbxlx',universeId:'123456',placeId:'654321',sourceRevision:'abcdef1234567890',evidence:badEvidence});
assert.equal(blocked.executionReady,false);
assert(blocked.blockedReasons.includes('evidence:runtime-not-passed'));

await assert.rejects(()=>publishRobloxPlace({plan:xmlPlan,apiKey:'',fetchImpl:async()=>{throw new Error('must not call');},readFile:()=>Buffer.from('place')}),/ROBLOX_OPEN_CLOUD_API_KEY required/);

let observedRequest=null;
const result=await publishRobloxPlace({
  plan:xmlPlan,
  apiKey:'test-secret-never-persist',
  readFile:()=>Buffer.from('<roblox/>'),
  fetchImpl:async(url,options)=>{
    observedRequest={url,options};
    return {ok:true,status:200,text:async()=>JSON.stringify({versionNumber:12})};
  },
});
assert.equal(result.state,'PUBLISHED');
assert.equal(result.versionNumber,12);
assert.equal(result.credentialPersisted,false);
assert.equal(observedRequest.options.headers['x-api-key'],'test-secret-never-persist');
assert(!JSON.stringify(xmlPlan).includes('test-secret-never-persist'));
assert(!JSON.stringify(result).includes('test-secret-never-persist'));

let busyCalls=0;
const busyWaits=[];
const busyRetryResult=await publishRobloxPlace({
  plan:xmlPlan,
  apiKey:'busy-retry-secret',
  readFile:()=>Buffer.from('<roblox/>'),
  retryDelaysMs:[1,2],
  sleepImpl:async ms=>{busyWaits.push(ms);},
  fetchImpl:async()=>{
    busyCalls+=1;
    if(busyCalls<3)return {ok:false,status:409,text:async()=>JSON.stringify({code:'Conflict',message:'Save failed. Server is busy and unable to process your upload request. Please try again in a couple minutes.'})};
    return {ok:true,status:200,text:async()=>JSON.stringify({versionNumber:13})};
  },
});
assert.equal(busyRetryResult.versionNumber,13);
assert.equal(busyCalls,3);
assert.deepEqual(busyWaits,[1,2]);

let nonBusyConflictCalls=0;
await assert.rejects(
  ()=>publishRobloxPlace({
    plan:xmlPlan,
    apiKey:'non-busy-conflict-secret',
    readFile:()=>Buffer.from('<roblox/>'),
    retryDelaysMs:[1,2],
    sleepImpl:async()=>{throw new Error('must not wait');},
    fetchImpl:async()=>{
      nonBusyConflictCalls+=1;
      return {ok:false,status:409,text:async()=>JSON.stringify({code:'Conflict',message:'Place version conflict'})};
    },
  }),
  /Roblox publish failed HTTP 409/,
);
assert.equal(nonBusyConflictCalls,1);

const reflectedSecret='server-echo-secret';
await assert.rejects(
  ()=>publishRobloxPlace({
    plan:xmlPlan,
    apiKey:reflectedSecret,
    readFile:()=>Buffer.from('<roblox/>'),
    fetchImpl:async()=>({ok:false,status:403,text:async()=>JSON.stringify({error:`denied ${reflectedSecret}`})}),
  }),
  error=>error instanceof Error&&error.message.includes('[REDACTED]')&&!error.message.includes(reflectedSecret),
);

console.log('PASS Roblox V3 platform adapter, technical evidence assembly, canonical runtime gate, root guard, transient busy retry and secret-safe publishing plan');


const ROBLOX_PORTFOLIO_ALL_GAME_IDS=[
  'seed-roblox-battleground-fight-welcome-to-bloxburg',
  'seed-roblox-obby-party-minigam-tower-of-hell',
  'seed-roblox-roleplay-life-avat-brookhaven-rp',
  'seed-roblox-simulator-tycoon-i-adopt-me',
  'seed-roblox-story-rpg-adventur-blox-fruits',
  'seed-roblox-survival-horror-es-doors',
];
const ROBLOX_ROADMAP=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
const ROBLOX_PERMANENTLY_REMOVED=new Set(ROBLOX_ROADMAP.permanentProjectRemoval?.ids||[]);
const ROBLOX_PORTFOLIO_REGRESSION_GAME_IDS=ROBLOX_PORTFOLIO_ALL_GAME_IDS.filter(gameId=>!ROBLOX_PERMANENTLY_REMOVED.has(gameId));

assert.equal(ROBLOX_ROADMAP.permanentProjectRemoval.reentryAllowed,false);
assert.equal(ROBLOX_ROADMAP.permanentProjectRemoval.automaticRecoveryAllowed,false);
assert.equal(ROBLOX_ROADMAP.permanentProjectRemoval.automaticMaintenanceAllowed,false);
for(const gameId of ROBLOX_PERMANENTLY_REMOVED){
  assert.equal(fs.existsSync(path.join('roblox-games',gameId)),false,`${gameId} Roblox source must remain deleted`);
}

for(const gameId of ROBLOX_PORTFOLIO_REGRESSION_GAME_IDS){
  const root=path.join('roblox-games',gameId);
  const evidence=JSON.parse(fs.readFileSync(path.join(root,'roblox-source-bootstrap.json'),'utf8'));
  const project=JSON.parse(fs.readFileSync(path.join(root,'default.project.json'),'utf8'));
  const shared=fs.readFileSync(path.join(root,'shared','GameConfig.luau'),'utf8');
  const server=fs.readFileSync(path.join(root,'server','Game.server.luau'),'utf8');
  const client=fs.readFileSync(path.join(root,'client','Game.client.luau'),'utf8');
  const allSource=shared+'\n'+server+'\n'+client;

  assert.equal(evidence.gameId,gameId,`${gameId} bootstrap identity mismatch`);
  assert.equal(evidence.platform,'ROBLOX',`${gameId} platform mismatch`);
  assert.equal(evidence.stage,'TARGET_PLATFORM_SOURCE_BIND',`${gameId} source-bind stage mismatch`);
  assert.equal(evidence.sourceValidationPassed,true,`${gameId} source validation must remain passed`);
  assert.equal(evidence.releaseClaim,false,`${gameId} must not claim release from source-only evidence`);
  assert.equal(evidence.approvedScopeCount>=1,true,`${gameId} approved scope missing`);
  assert.deepEqual(
    new Set(evidence.generatedFiles||[]),
    new Set(['shared/GameConfig.luau','server/Game.server.luau','client/Game.client.luau','default.project.json']),
    `${gameId} generated file contract drift`,
  );

  assert.equal(project?.tree?.ReplicatedStorage?.Shared?.['$path'],'shared',`${gameId} shared Rojo mapping drift`);
  assert.equal(project?.tree?.ServerScriptService?.GameServer?.['$path'],'server',`${gameId} server Rojo mapping drift`);
  assert.equal(project?.tree?.StarterPlayer?.StarterPlayerScripts?.GameClient?.['$path'],'client',`${gameId} client Rojo mapping drift`);

  assert.doesNotMatch(allSource,/(?:TODO|FIXME|placeholder|not implemented)/i,`${gameId} placeholder source forbidden`);
  assert.match(server,/RemoteEvent/,`${gameId} RemoteEvent boundary missing`);
  assert.match(server,/OnServerEvent/,`${gameId} server-authoritative event handler missing`);
  assert.match(client,/(?:UserInputService|ContextActionService|Activated)/,`${gameId} mobile/client input path missing`);

  if(evidence.saveRequired===true){
    assert.match(server,/DataStoreService/,`${gameId} persistent design requires DataStoreService`);
    assert.match(server,/GetAsync/,`${gameId} persistent design requires datastore read`);
    assert.match(server,/(?:SetAsync|UpdateAsync)/,`${gameId} persistent design requires datastore write`);
  }
}

console.log(`PASS active Roblox source regression: ${ROBLOX_PORTFOLIO_REGRESSION_GAME_IDS.length}/${ROBLOX_PORTFOLIO_ALL_GAME_IDS.length-ROBLOX_PERMANENTLY_REMOVED.size}`);


test('Roblox runtime candidate publish plan accepts exact F0 evidence but never claims runtime or internal release',()=>{
  const revision='a'.repeat(40),artifact='sha256:'+'b'.repeat(64);
  const plan=createRobloxRuntimeCandidatePublishPlan({
    placeFile:'roblox-games/demo/place.rbxl',
    universeId:'123',placeId:'456',sourceRevision:revision,artifactIdentity:artifact,
    f0Evidence:{sourcePreflightPassed:true,f0SourceIntegrityPassed:true,actualRuntimeEvidence:false,runtimeFoundationPassed:false,sourceRevision:revision,artifactIdentity:artifact,artifactRunId:77}
  });
  assert.equal(plan.executionReady,true);
  assert.equal(plan.planKind,'PRIVATE_RUNTIME_CANDIDATE');
  assert.equal(plan.releaseClaim,false);
  assert.equal(plan.evidenceGate.runtimeClaimAllowed,false);
  assert.equal(plan.evidenceGate.internalReleaseClaimAllowed,false);
  assert.equal(plan.actualRuntimeValidationRequiredAfterPublish,true);
});

test('Roblox runtime candidate publish plan rejects headless evidence that claims runtime',()=>{
  const revision='a'.repeat(40),artifact='sha256:'+'b'.repeat(64);
  const plan=createRobloxRuntimeCandidatePublishPlan({
    placeFile:'roblox-games/demo/place.rbxl',
    universeId:'123',placeId:'456',sourceRevision:revision,artifactIdentity:artifact,
    f0Evidence:{sourcePreflightPassed:true,f0SourceIntegrityPassed:true,actualRuntimeEvidence:true,runtimeFoundationPassed:true,sourceRevision:revision,artifactIdentity:artifact,artifactRunId:77}
  });
  assert.equal(plan.executionReady,false);
  assert.ok(plan.blockedReasons.includes('f0-must-not-claim-runtime-evidence'));
  assert.ok(plan.blockedReasons.includes('f0-must-not-claim-runtime-foundation'));
});


test('Roblox release evidence rejects marker-only runtime claims even when all legacy booleans are true',()=>{
  const markerOnly={...evidence,actualRuntimeEvidence:false,runtimeFoundationPassed:false};
  const gate=validateRobloxReleaseEvidence(markerOnly,'abcdef1234567890');
  assert.equal(gate.pass,false);
  assert.ok(gate.blockedReasons.includes('actual-runtime-evidence-missing'));
  assert.ok(gate.blockedReasons.includes('runtime-foundation-not-passed'));
});
