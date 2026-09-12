import assert from 'node:assert/strict';
import {
  ROBLOX_PLATFORM_POLICY,
  createRobloxPlatformContract,
  validateRobloxSourcePath,
  validateRobloxReleaseEvidence,
  createRobloxPlacePublishPlan,
  publishRobloxPlace,
} from '../tools/vibe3-roblox-platform.mjs';

const contract=createRobloxPlatformContract();
assert.equal(contract.platform,'ROBLOX');
assert.equal(contract.roadmapPhase,'ROBLOX_FAST_RELEASE_STABILIZATION');
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
  runtimePassed:true,
  independentQaPassed:true,
  regressionPassed:true,
  protectedStatePreserved:true,
  exactRevision:true,
};
const gate=validateRobloxReleaseEvidence(evidence,'abcdef1234567890');
assert.equal(gate.pass,true);
assert.equal(gate.browserQa,'NOT_APPLICABLE');

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

console.log('PASS Roblox V3 platform adapter, evidence gate, root guard and secret-safe publishing plan');
