// Vibe3 Roblox platform adapter.
// This is an adapter inside the existing V3 Pump execution chain, not a parallel pipeline.
// Live publishing is opt-in (--execute) and credentials are read only from environment variables.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {normalizeCommonEvidence} from './company-selected-platform-router.mjs';

const clean=value=>String(value??'').trim();
const upper=value=>clean(value).toUpperCase();
const DIGITS=/^[1-9][0-9]*$/;
const SHA=/^[0-9a-f]{7,40}$/i;
const COMMIT40=/^[0-9a-f]{40}$/i;
const ARTIFACT_SHA256=/^sha256:[0-9a-f]{64}$/i;
const ROBLOX_SOURCE_EXTENSIONS=Object.freeze(['.luau','.lua','.rbxl','.rbxlx']);
const PUBLISH_EXTENSIONS=Object.freeze(['.rbxl','.rbxlx']);
const PUBLISH_LIMITED_INSTANCE_TYPES=Object.freeze(['EditableImage','EditableMesh','PartOperation','SurfaceAppearance','BaseWrap']);
const ROBLOX_PUBLISH_BUSY_RETRY_DELAYS_MS=Object.freeze([30_000,60_000,120_000]);

export const ROBLOX_PLATFORM_POLICY=Object.freeze({
  version:1,
  platform:'ROBLOX',
  roadmapPhase:'ROBLOX_UNITY_CONCURRENT_RELEASE_EXPERIENCE',
  pipeline:'V3-PUMP',
  parallelPipeline:false,
  sourceRoot:'roblox-games/',
  taskType:'roblox',
  publishApi:'ROBLOX_OPEN_CLOUD_PLACE_PUBLISHING',
  auth:'API_KEY',
  cookieAuthAllowed:false,
  requiredApiPermission:'universe-places:write',
  env:Object.freeze({apiKey:'ROBLOX_OPEN_CLOUD_API_KEY',universeId:'ROBLOX_UNIVERSE_ID',placeId:'ROBLOX_PLACE_ID'}),
  publishExtensions:PUBLISH_EXTENSIONS,
  sourceExtensions:ROBLOX_SOURCE_EXTENSIONS,
  publishingLimitations:PUBLISH_LIMITED_INSTANCE_TYPES,
  dryRunDefault:true,
  buildOncePerSourceFingerprint:true,
  immutableArtifactRequired:true,
  sameArtifactAcrossRuntimeQaRegression:true,
  resumeExactFailurePoint:true,
  cronRole:'WATCHDOG_AND_RECOVERY_ONLY',
  positiveExperienceRequires:Object.freeze(['VERIFIED_WINNER','RUNTIME_PASS','INDEPENDENT_QA_PASS','REGRESSION_PASS','PROTECTED_STATE_PRESERVED','EXACT_REVISION']),
  canonicalDistillationOnly:true,
});

export function createRobloxPlatformContract(){
  return Object.freeze({
    ...ROBLOX_PLATFORM_POLICY,
    qualityGateWeakeningAllowed:false,
    commonEvidenceSchema:true,
    qa:Object.freeze({browserQa:'NOT_APPLICABLE',runtime:'PASS',independentQa:'PASS',saveRejoinCheck:'WHEN_APPLICABLE',mobileUiCheck:'PASS',serverClientBoundaryCheck:true,multiplayerQa:'WHEN_APPLICABLE'}),
    publishing:Object.freeze({method:'POST',endpointTemplate:'https://apis.roblox.com/universes/v1/{universeId}/places/{placeId}/versions?versionType=Published',apiKeyHeader:'x-api-key',secretPersisted:false,secretPrinted:false,liveExecutionRequiresExplicitFlag:true,placeFileMustRemainUnderSourceRoot:true}),
    learning:Object.freeze({separateCron:false,separateDataset:false,separateTrainer:false,useExistingCanonicalDistillation:true}),
    authority:'roblox-platform-adapter-contract',
  });
}

export function normalizeRobloxDevelopmentEvidence(evidence={},defaults={}){
  return normalizeCommonEvidence({...evidence,platform:'ROBLOX'},{...defaults,platform:'ROBLOX'});
}

export function validateRobloxSourcePath(sourcePath=''){
  const normalized=clean(sourcePath).replaceAll('\\','/');
  const ext=path.posix.extname(normalized).toLowerCase();
  const underRoot=normalized.startsWith(ROBLOX_PLATFORM_POLICY.sourceRoot);
  const extensionAllowed=ROBLOX_SOURCE_EXTENSIONS.includes(ext);
  return Object.freeze({pass:Boolean(normalized)&&underRoot&&extensionAllowed,path:normalized,extension:ext,underRoot,extensionAllowed,allowedExtensions:ROBLOX_SOURCE_EXTENSIONS});
}

function passed(value,field=''){
  if(field&&value?.[field]===true)return true;
  return value?.pass===true||value?.validated===true||upper(value?.state)==='PASS';
}

export function assembleRobloxTechnicalEvidence({build={},runtime={},independent={},regression={}}={}){
  const sourceRevision=clean(build.sourceRevision||build.sourceCommit||build.revision);
  const sourceFingerprint=clean(build.sourceFingerprint);
  const artifactIdentity=clean(build.artifactIdentity||build.placeSha256||build.sha256||build.buildId);
  const bindings=[runtime,independent,regression];
  const sameRevision=Boolean(sourceRevision)&&bindings.every(row=>!clean(row.sourceRevision||row.sourceCommit||row.buildSourceCommit)||clean(row.sourceRevision||row.sourceCommit||row.buildSourceCommit)===sourceRevision);
  const sameArtifact=Boolean(artifactIdentity)&&bindings.every(row=>!clean(row.artifactIdentity||row.placeSha256||row.sha256||row.buildId)||clean(row.artifactIdentity||row.placeSha256||row.sha256||row.buildId)===artifactIdentity);
  const buildOrPackagePassed=passed(build,'buildOrPackagePassed');
  const luauOrSourceValidationPassed=build.luauOrSourceValidationPassed===true||upper(build.sourceValidation)==='PASS';
  const actualRuntimeEvidence=runtime.actualRuntimeEvidence===true||runtime.actualPlatformRuntime===true;
  const runtimeFoundationPassed=runtime.runtimeFoundationPassed===true;
  const runtimePassed=runtime.runtimePassed===true||upper(runtime.runtime)==='PASS';
  const serverClientBoundaryPassed=runtime.serverClientBoundaryPassed===true;
  const saveExists=runtime.saveExists===true;
  const datastoreRejoinPassed=runtime.datastoreRejoinPassed===true;
  const mobileControlUiPassed=runtime.mobileControlUiPassed===true;
  const multiplayerApplicable=runtime.multiplayerApplicable===true;
  const multiplayerQaPassed=runtime.multiplayerQaPassed===true;
  const independentQaPassed=independent.independentQaPassed===true||upper(independent.independentQa)==='PASS';
  const regressionPassed=regression.regressionPassed===true||upper(regression.regression)==='PASS';
  const protectedStatePreserved=regression.protectedStatePreserved===true;
  const exactRevision=regression.exactRevision===true&&sameRevision&&sameArtifact;
  const evidence={
    version:1,
    platform:'ROBLOX',
    target:'ROBLOX_TECHNICAL_VALIDATION',
    checkedAt:new Date().toISOString(),
    sourceRevision,
    sourceFingerprint:sourceFingerprint||null,
    buildOrPackagePassed,
    artifactIdentity:artifactIdentity||null,
    luauOrSourceValidationPassed,
    actualRuntimeEvidence,
    runtimeFoundationPassed,
    runtimePassed,
    runtime:runtimePassed?'PASS':'FAIL',
    serverClientBoundaryPassed,
    saveExists,
    datastoreRejoinPassed,
    mobileControlUiPassed,
    multiplayerApplicable,
    multiplayerQaPassed,
    independentQaPassed,
    independentQa:independentQaPassed?'PASS':'FAIL',
    regressionPassed,
    protectedStatePreserved,
    exactRevision,
    sameRevision,
    sameArtifact,
    browserQa:'NOT_APPLICABLE',
    provenance:{
      build:clean(build.provenance||build.evidencePath)||null,
      runtime:clean(runtime.provenance||runtime.evidencePath)||null,
      independent:clean(independent.provenance||independent.evidencePath)||null,
      regression:clean(regression.provenance||regression.evidencePath)||null,
    },
  };
  const gate=validateRobloxReleaseEvidence(evidence,sourceRevision);
  evidence.pass=gate.pass;
  evidence.validated=gate.pass;
  evidence.state=gate.pass?'PASS':'FAIL';
  evidence.blockedReasons=[...gate.blockedReasons];
  evidence.authority='roblox-technical-validation-evidence';
  return Object.freeze(evidence);
}

export function assembleRobloxDevelopmentReleaseEvidence(item={}){
  const validationMode=upper(item.robloxValidationMode);
  const sourceRevision=clean(item.robloxSourceCommit);
  const artifactIdentity=clean(item.robloxBuildArtifactIdentity);
  const f0=item.robloxFoundationF0Evidence||item.robloxHeadlessFastMvpEvidence||{};
  if(['HEADLESS_FAST_MVP','HEADLESS_SOURCE_PREFLIGHT_F0'].includes(validationMode)){
    return Object.freeze({
      version:4,
      platform:'ROBLOX',
      target:'ROBLOX_DEVELOPMENT_FINAL_RELEASE',
      validationMode:'HEADLESS_SOURCE_PREFLIGHT_F0',
      checkedAt:new Date().toISOString(),
      sourceRevision,
      artifactIdentity:artifactIdentity||null,
      sourcePreflightPassed:item.robloxFoundationF0Passed===true&&f0.sourcePreflightPassed===true,
      actualRuntimeEvidence:false,
      runtimeFoundationPassed:false,
      runtimePassed:false,
      independentQaPassed:false,
      regressionPassed:false,
      finalReviewPassed:false,
      exactRevision:false,
      protectedStatePreserved:false,
      pass:false,
      validated:false,
      state:'FAIL',
      blockedReasons:['headless-source-preflight-cannot-satisfy-runtime-release'],
      authority:'roblox-f0-cannot-authorize-release'
    });
  }

  const preflight=item.robloxBuildPreflightEvidence||{};
  const runtime=item.robloxRuntimeEvidence||{};
  const foundation=item.robloxRuntimeFoundationEvidence||{};
  const post=item.robloxPostRuntimeQaEvidence||{};
  const multiplayer=item.robloxMultiplayerQaEvidence||{};
  const multiplayerApplicable=item.robloxMultiplayerApplicable===true;
  const mode=upper(item.robloxMultiplayerMode);
  const actualRuntimeEvidence=
    runtime.actualPlatformRuntime===true
    ||runtime.actualRuntimeEvidence===true
    ||foundation.actualRuntimeEvidence===true
    ||/roblox-real-studio-runtime/i.test(clean(runtime.authority));
  const actualPostRuntimeEvidence=
    post.actualRuntimeEvidence===true
    ||/real-studio-post-runtime-qa/i.test(clean(post.authority))
    ||/existing-independent-qa-native-foundation/i.test(clean(post.authority));

  const requiredBindings=[preflight,runtime,post];
  if(multiplayerApplicable&&Object.keys(multiplayer).length)requiredBindings.push(multiplayer);
  const sameRevision=COMMIT40.test(sourceRevision)&&requiredBindings.every(row=>clean(row?.sourceRevision)===sourceRevision);
  const sameArtifact=ARTIFACT_SHA256.test(artifactIdentity)&&requiredBindings.every(row=>clean(row?.artifactIdentity)===artifactIdentity);
  const runIds=[
    runtime.artifactRunId,
    post.artifactRunId,
    ...(multiplayerApplicable&&Object.keys(multiplayer).length?[multiplayer.artifactRunId]:[])
  ].map(value=>Number(value)).filter(value=>Number.isInteger(value)&&value>0);
  const sameArtifactRun=runIds.length>0&&runIds.every(value=>value===runIds[0]);

  const sourceValidated=
    Boolean(item.robloxSourceBootstrapPassedAt)
    &&item.robloxBuildPreflightPassed===true
    &&preflight.pass===true
    &&clean(preflight.sourceRevision)===sourceRevision
    &&clean(preflight.artifactIdentity)===artifactIdentity;
  const buildOrPackagePassed=
    item.robloxBuildOrPackagePassed===true
    &&clean(item.robloxBuildSourceRevision)===sourceRevision
    &&sourceValidated;
  const runtimeFoundationPassed=
    Object.keys(foundation).length
      ? item.robloxRuntimeFoundationPassed===true&&foundation.runtimeFoundationPassed===true&&foundation.actualRuntimeEvidence===true
      : actualRuntimeEvidence;
  const runtimePassed=
    item.robloxRuntimePassed===true
    &&runtime.runtimePassed===true
    &&runtime.serverClientBoundaryPassed===true
    &&actualRuntimeEvidence;
  const serverClientBoundaryPassed=item.robloxServerClientBoundaryPassed===true&&runtime.serverClientBoundaryPassed===true;
  const saveExists=runtime.saveExists===true||runtime.requirements?.saveEnabled===true||foundation.requirements?.saveEnabled===true;
  const datastoreRejoinPassed=!saveExists||(item.robloxDatastoreRejoinPassed===true&&(runtime.datastoreRejoinPassed===true||runtime.f6CoreServicesPassed===true));
  const mobileControlUiPassed=
    item.robloxMobileControlUiPassed===true
    &&(post.mobileControlUiPassed===true||post.runtimeFoundationEvidence?.f5InputCameraUiPassed===true||runtime.f5InputCameraUiPassed===true);
  const independentQaPassed=item.robloxIndependentQaPassed===true&&post.independentQaPassed===true&&actualPostRuntimeEvidence;
  const regressionPassed=item.robloxRegressionPassed===true&&post.regressionPassed===true&&(post.exactRevision===true||sameRevision);
  const runtimeMultiplayerPassed=
    runtime.f7MultiplayerFoundationPassed===true
    ||foundation.f7MultiplayerFoundationPassed===true;
  const legacyMultiplayerPassed=
    item.robloxMultiplayerQaPassed===true
    &&multiplayer.multiplayerQaPassed===true
    &&multiplayer.actualStudioRuntime===true
    &&Number(multiplayer.multiplayerClients)>=2
    &&multiplayer.distinctPlayersPassed===true
    &&multiplayer.serverAuthoritativeRoundtripPassed===true
    &&multiplayer.peerVisibilityPassed===true;
  const multiplayerQaPassed=!multiplayerApplicable||(
    ['COOP','COMPETITIVE','HYBRID'].includes(mode)
    &&item.robloxMultiplayerQaPassed===true
    &&(runtimeMultiplayerPassed||legacyMultiplayerPassed)
  );
  const finalReviewPassed=item.robloxFinalReviewPassed===true;
  const exactRevision=item.robloxExactRevisionPassed===true&&sameRevision&&sameArtifact&&sameArtifactRun;
  const protectedStatePreserved=
    runtimeFoundationPassed
    &&runtimePassed
    &&serverClientBoundaryPassed
    &&datastoreRejoinPassed
    &&mobileControlUiPassed
    &&independentQaPassed
    &&regressionPassed
    &&multiplayerQaPassed
    &&finalReviewPassed
    &&exactRevision;

  const evidence={
    version:4,
    platform:'ROBLOX',
    target:'ROBLOX_DEVELOPMENT_FINAL_RELEASE',
    validationMode:validationMode||'ACTUAL_PLATFORM_RUNTIME',
    checkedAt:new Date().toISOString(),
    sourceRevision,
    sourceFingerprint:clean(item.robloxSourceFingerprint)||null,
    artifactIdentity:artifactIdentity||null,
    artifactRunId:runIds[0]||null,
    buildOrPackagePassed,
    luauOrSourceValidationPassed:sourceValidated,
    sourcePreflightPassed:item.robloxFoundationF0Passed===true||f0.sourcePreflightPassed===true,
    actualRuntimeEvidence,
    runtimeFoundationPassed,
    runtimePassed,
    runtime:runtimePassed?'PASS':'FAIL',
    serverClientBoundaryPassed,
    saveExists,
    datastoreRejoinPassed,
    mobileControlUiPassed,
    multiplayerApplicable,
    multiplayerMode:mode||null,
    multiplayerQaPassed,
    independentQaPassed,
    independentQa:independentQaPassed?'PASS':'FAIL',
    regressionPassed,
    protectedStatePreserved,
    finalReviewPassed,
    exactRevision,
    sameRevision,
    sameArtifact,
    sameArtifactRun,
    browserQa:'NOT_APPLICABLE',
    provenance:{
      f0:f0.authority||null,
      buildPreflight:preflight.authority||null,
      runtime:runtime.authority||null,
      foundation:foundation.authority||null,
      postRuntime:post.authority||null,
      multiplayer:multiplayerApplicable?(runtimeMultiplayerPassed?(foundation.authority||runtime.authority||null):(multiplayer.authority||null)):'NOT_APPLICABLE',
      finalReview:item.robloxF9ReleaseRegressionEvidence?.authority||'company-development-roblox-final-review',
    },
  };
  const gate=validateRobloxReleaseEvidence(evidence,sourceRevision);
  const blocked=[...gate.blockedReasons];
  if(!COMMIT40.test(sourceRevision))blocked.push('development-source-revision-invalid');
  if(!ARTIFACT_SHA256.test(artifactIdentity))blocked.push('development-artifact-identity-invalid');
  if(!sameArtifactRun)blocked.push('development-artifact-run-mismatch');
  if(!finalReviewPassed)blocked.push('final-review-not-passed');
  const blockedReasons=[...new Set(blocked)];
  evidence.pass=blockedReasons.length===0;
  evidence.validated=evidence.pass;
  evidence.state=evidence.pass?'PASS':'FAIL';
  evidence.blockedReasons=blockedReasons;
  evidence.authority='roblox-development-canonical-release-evidence';
  return Object.freeze(evidence);
}

export function validateRobloxReleaseEvidence(evidence={},sourceRevision=''){
  const blocked=[];
  const revision=clean(sourceRevision||evidence.sourceRevision);
  if(['HEADLESS_FAST_MVP','HEADLESS_SOURCE_PREFLIGHT_F0'].includes(upper(evidence.validationMode))){
    return Object.freeze({
      pass:false,
      sourceRevision:revision,
      blockedReasons:Object.freeze(['headless-source-preflight-cannot-satisfy-runtime-release']),
      browserQa:'NOT_APPLICABLE',
      authority:'roblox-f0-release-block'
    });
  }
  if(!SHA.test(revision))blocked.push('source-revision-invalid');
  if(clean(evidence.sourceRevision)!==revision)blocked.push('exact-source-revision-mismatch');
  if(evidence.buildOrPackagePassed!==true)blocked.push('build-or-package-not-passed');
  if(!clean(evidence.artifactIdentity))blocked.push('artifact-identity-missing');
  if(evidence.luauOrSourceValidationPassed!==true)blocked.push('luau-or-source-validation-not-passed');
  if(evidence.actualRuntimeEvidence!==true)blocked.push('actual-runtime-evidence-missing');
  if(evidence.runtimeFoundationPassed!==true)blocked.push('runtime-foundation-not-passed');
  if(evidence.runtimePassed!==true&&upper(evidence.runtime)!=='PASS')blocked.push('runtime-not-passed');
  if(evidence.serverClientBoundaryPassed!==true)blocked.push('server-client-boundary-not-passed');
  if(evidence.saveExists===true&&evidence.datastoreRejoinPassed!==true)blocked.push('datastore-rejoin-not-passed');
  if(evidence.mobileControlUiPassed!==true)blocked.push('mobile-control-ui-not-passed');
  if(evidence.multiplayerApplicable===true&&evidence.multiplayerQaPassed!==true)blocked.push('multiplayer-qa-not-passed');
  if(evidence.independentQaPassed!==true&&upper(evidence.independentQa)!=='PASS')blocked.push('independent-qa-not-passed');
  if(evidence.regressionPassed!==true)blocked.push('regression-not-passed');
  if(evidence.protectedStatePreserved!==true)blocked.push('protected-state-unproven');
  if(evidence.exactRevision!==true)blocked.push('exact-revision-unproven');
  return Object.freeze({
    pass:blocked.length===0,
    sourceRevision:revision,
    blockedReasons:Object.freeze(blocked),
    browserQa:'NOT_APPLICABLE',
    authority:'roblox-release-evidence-gate'
  });
}

function contentTypeForPlaceFile(placeFile=''){
  const ext=path.extname(clean(placeFile)).toLowerCase();
  if(ext==='.rbxlx')return'application/xml';
  if(ext==='.rbxl')return'application/octet-stream';
  return null;
}

function redactSecret(value,secret=''){
  const text=String(value??'');
  const token=clean(secret);
  return token?text.split(token).join('[REDACTED]'):text;
}

function isTransientRobloxPublishBusy(status,payload){
  const detail=JSON.stringify(payload??'');
  return Number(status)===409&&/server is busy|unable to process your upload request/i.test(detail);
}

function sleep(ms){return new Promise(resolve=>setTimeout(resolve,ms));}

export function createRobloxPlacePublishPlan({placeFile='',universeId='',placeId='',sourceRevision='',evidence={}}={}){
  const file=clean(placeFile).replaceAll('\\','/'),universe=clean(universeId),place=clean(placeId),contentType=contentTypeForPlaceFile(file),blocked=[];
  const sourcePath=validateRobloxSourcePath(file);
  if(!file)blocked.push('place-file-missing');
  if(file&&!sourcePath.underRoot)blocked.push('place-file-outside-roblox-root');
  if(!contentType)blocked.push('place-file-extension-unsupported');
  if(!DIGITS.test(universe))blocked.push('universe-id-invalid');
  if(!DIGITS.test(place))blocked.push('place-id-invalid');
  const evidenceGate=validateRobloxReleaseEvidence(evidence,sourceRevision);
  if(!evidenceGate.pass)blocked.push(...evidenceGate.blockedReasons.map(reason=>`evidence:${reason}`));
  const endpoint=(DIGITS.test(universe)&&DIGITS.test(place))?`https://apis.roblox.com/universes/v1/${universe}/places/${place}/versions?versionType=Published`:null;
  return Object.freeze({
    version:1,
    platform:'ROBLOX',
    roadmapPhase:ROBLOX_PLATFORM_POLICY.roadmapPhase,
    taskType:'roblox',
    executionReady:blocked.length===0,
    dryRun:true,
    method:'POST',
    endpoint,
    placeFile:file||null,
    contentType,
    sourceRoot:ROBLOX_PLATFORM_POLICY.sourceRoot,
    sourceRevision:evidenceGate.sourceRevision||null,
    auth:Object.freeze({type:'API_KEY',header:'x-api-key',valueSource:'ENV:ROBLOX_OPEN_CLOUD_API_KEY',secretIncluded:false}),
    requiredApiPermission:ROBLOX_PLATFORM_POLICY.requiredApiPermission,
    publishingLimitations:PUBLISH_LIMITED_INSTANCE_TYPES,
    evidenceGate,
    blockedReasons:Object.freeze([...new Set(blocked)]),
    noCookieAuth:true,
    noParallelPipeline:true,
    authority:'roblox-place-publish-plan',
  });
}


export function createRobloxRuntimeCandidatePublishPlan({placeFile='',universeId='',placeId='',sourceRevision='',artifactIdentity='',f0Evidence={}}={}){
  const file=clean(placeFile).replaceAll('\\','/'),universe=clean(universeId),place=clean(placeId),revision=clean(sourceRevision),artifact=clean(artifactIdentity),blocked=[];
  const sourcePath=validateRobloxSourcePath(file);
  const contentType=contentTypeForPlaceFile(file);
  if(!file)blocked.push('place-file-missing');
  if(file&&!sourcePath.underRoot)blocked.push('place-file-outside-roblox-root');
  if(!contentType)blocked.push('place-file-extension-unsupported');
  if(!DIGITS.test(universe))blocked.push('universe-id-invalid');
  if(!DIGITS.test(place))blocked.push('place-id-invalid');
  if(!COMMIT40.test(revision))blocked.push('source-revision-invalid');
  if(!ARTIFACT_SHA256.test(artifact))blocked.push('artifact-identity-invalid');
  if(f0Evidence?.sourcePreflightPassed!==true)blocked.push('f0-source-preflight-not-passed');
  if(f0Evidence?.f0SourceIntegrityPassed!==true)blocked.push('f0-source-integrity-not-passed');
  if(f0Evidence?.actualRuntimeEvidence!==false)blocked.push('f0-must-not-claim-runtime-evidence');
  if(f0Evidence?.runtimeFoundationPassed!==false)blocked.push('f0-must-not-claim-runtime-foundation');
  if(clean(f0Evidence?.sourceRevision)!==revision)blocked.push('f0-source-revision-mismatch');
  if(clean(f0Evidence?.artifactIdentity)!==artifact)blocked.push('f0-artifact-identity-mismatch');
  if(!Number.isInteger(Number(f0Evidence?.artifactRunId))||Number(f0Evidence?.artifactRunId)<=0)blocked.push('f0-artifact-run-missing');
  const endpoint=(DIGITS.test(universe)&&DIGITS.test(place))?`https://apis.roblox.com/universes/v1/${universe}/places/${place}/versions?versionType=Published`:null;
  return Object.freeze({
    version:1,
    platform:'ROBLOX',
    planKind:'PRIVATE_RUNTIME_CANDIDATE',
    executionReady:blocked.length===0,
    dryRun:true,
    method:'POST',
    endpoint,
    placeFile:file||null,
    contentType,
    sourceRoot:ROBLOX_PLATFORM_POLICY.sourceRoot,
    sourceRevision:revision||null,
    artifactIdentity:artifact||null,
    auth:Object.freeze({type:'API_KEY',header:'x-api-key',valueSource:'ENV:ROBLOX_OPEN_CLOUD_API_KEY',secretIncluded:false}),
    requiredApiPermission:ROBLOX_PLATFORM_POLICY.requiredApiPermission,
    evidenceGate:Object.freeze({
      pass:blocked.length===0,
      sourcePreflightPassed:f0Evidence?.sourcePreflightPassed===true,
      runtimeClaimAllowed:false,
      internalReleaseClaimAllowed:false,
      authority:'roblox-f0-runtime-candidate-gate'
    }),
    blockedReasons:Object.freeze([...new Set(blocked)]),
    releaseClaim:false,
    actualRuntimeValidationRequiredAfterPublish:true,
    noParallelPipeline:true,
    authority:'roblox-place-publish-plan',
  });
}

export async function publishRobloxPlace({plan,apiKey=process.env.ROBLOX_OPEN_CLOUD_API_KEY,fetchImpl=globalThis.fetch,readFile=fs.readFileSync,sleepImpl=sleep,retryDelaysMs=ROBLOX_PUBLISH_BUSY_RETRY_DELAYS_MS}={}){
  if(plan?.authority!=='roblox-place-publish-plan')throw new Error('validated Roblox publish plan required');
  if(plan.executionReady!==true)throw new Error(`Roblox publish blocked: ${(plan.blockedReasons||[]).join(',')}`);
  const secret=clean(apiKey);
  if(!secret)throw new Error('ROBLOX_OPEN_CLOUD_API_KEY required for live publish');
  if(typeof fetchImpl!=='function')throw new Error('fetch implementation unavailable');
  if(typeof sleepImpl!=='function')throw new Error('sleep implementation unavailable');
  const delays=Array.isArray(retryDelaysMs)?retryDelaysMs.map(Number):[];
  if(delays.some(delay=>!Number.isFinite(delay)||delay<0))throw new Error('Roblox publish retry delays invalid');
  const body=readFile(plan.placeFile);
  for(let attempt=0;attempt<=delays.length;attempt+=1){
    const response=await fetchImpl(plan.endpoint,{method:'POST',headers:{'x-api-key':secret,'Content-Type':plan.contentType},body});
    const text=await response.text();
    let payload=null;
    try{payload=text?JSON.parse(text):null;}catch{payload={raw:text.slice(0,1000)};}
    if(!response.ok){
      const safePayload=redactSecret(JSON.stringify(payload),secret);
      if(isTransientRobloxPublishBusy(response.status,payload)&&attempt<delays.length){
        const waitMs=delays[attempt];
        console.warn(`ROBLOX_PUBLISH_TRANSIENT_BUSY_RETRY=${attempt+1}/${delays.length};WAIT_MS=${waitMs}`);
        await sleepImpl(waitMs);
        continue;
      }
      throw new Error(`Roblox publish failed HTTP ${response.status}: ${safePayload}`);
    }
    const versionNumber=Number(payload?.versionNumber);
    if(!Number.isInteger(versionNumber)||versionNumber<=0)throw new Error('Roblox publish response missing versionNumber');
    return Object.freeze({version:1,state:'PUBLISHED',platform:'ROBLOX',versionNumber,sourceRevision:plan.sourceRevision,placeFile:plan.placeFile,endpoint:plan.endpoint,credentialPersisted:false,authority:'roblox-place-publish-result'});
  }
  throw new Error('Roblox publish retry loop exhausted');
}

function parseArgs(argv){const args={};for(let i=0;i<argv.length;i+=1){const arg=argv[i];if(!arg.startsWith('--'))continue;const [key,inline]=arg.slice(2).split('=',2);if(key==='execute'||key==='assemble-evidence'||key==='assemble-development-release-evidence'){args[key]=true;continue;}args[key]=inline??argv[++i];}return args;}
function readJson(file){return JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));}
function requireJson(args,key){const file=clean(args[key]);if(!file||!fs.existsSync(file))throw new Error(`${key} evidence missing: ${file}`);const value=readJson(file);return {...value,evidencePath:file};}
async function main(){
  const args=parseArgs(process.argv.slice(2));
  if(args['assemble-evidence']===true){
    const output=clean(args.output);
    if(!output)throw new Error('output required for --assemble-evidence');
    const evidence=assembleRobloxTechnicalEvidence({
      build:requireJson(args,'build-info'),
      runtime:requireJson(args,'runtime'),
      independent:requireJson(args,'independent'),
      regression:requireJson(args,'regression'),
    });
    fs.mkdirSync(path.dirname(output),{recursive:true});
    fs.writeFileSync(output,`${JSON.stringify(evidence,null,2)}\n`);
    console.log(`ROBLOX_TECHNICAL_VALIDATION=${evidence.state}`);
    console.log(`ROBLOX_BINDING_MATCH=${evidence.sameRevision&&evidence.sameArtifact}`);
    if(!evidence.pass)process.exitCode=2;
    return;
  }
  if(args['assemble-development-release-evidence']===true){
    const queueFile=clean(args.queue);
    const gameId=clean(args['game-id']);
    const output=clean(args.output);
    if(!queueFile||!gameId||!output)throw new Error('queue, game-id and output required for --assemble-development-release-evidence');
    const queue=readJson(queueFile);
    const item=(queue.items||[]).find(row=>clean(row?.gameId)===gameId);
    if(!item)throw new Error(`development queue item missing: ${gameId}`);
    const evidence=assembleRobloxDevelopmentReleaseEvidence(item);
    fs.mkdirSync(path.dirname(output),{recursive:true});
    fs.writeFileSync(output,`${JSON.stringify(evidence,null,2)}\n`);
    console.log(`ROBLOX_DEVELOPMENT_RELEASE_EVIDENCE=${evidence.state}`);
    console.log(`ROBLOX_DEVELOPMENT_RELEASE_BINDING_MATCH=${evidence.sameRevision&&evidence.sameArtifact&&evidence.sameArtifactRun}`);
    if(!evidence.pass)process.exitCode=2;
    return;
  }
  const evidence=args.evidence?readJson(args.evidence):{};
  const plan=createRobloxPlacePublishPlan({
    placeFile:args['place-file'],
    universeId:args['universe-id']||process.env.ROBLOX_UNIVERSE_ID,
    placeId:args['place-id']||process.env.ROBLOX_PLACE_ID,
    sourceRevision:args['source-revision'],
    evidence,
  });
  if(args.execute!==true){
    console.log(`ROBLOX_V3_STATE=${plan.executionReady?'READY':'BLOCKED'}`);
    console.log(JSON.stringify(plan,null,2));
    if(!plan.executionReady)process.exitCode=2;
    return;
  }
  const result=await publishRobloxPlace({plan});
  console.log('ROBLOX_V3_STATE=PUBLISHED');
  console.log(`ROBLOX_PUBLISHED_VERSION_NUMBER=${result.versionNumber}`);
  console.log(JSON.stringify(result,null,2));
}

const isMain=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(isMain){main().catch(error=>{console.error(error.message);process.exitCode=1;});}
