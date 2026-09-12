// Vibe3 Roblox platform adapter.
// This is an adapter inside the existing V3 Pump execution chain, not a parallel pipeline.
// Live publishing is opt-in (--execute) and credentials are read only from environment variables.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const clean=value=>String(value??'').trim();
const upper=value=>clean(value).toUpperCase();
const DIGITS=/^[1-9][0-9]*$/;
const SHA=/^[0-9a-f]{7,40}$/i;
const ROBLOX_SOURCE_EXTENSIONS=Object.freeze(['.luau','.lua','.rbxl','.rbxlx']);
const PUBLISH_EXTENSIONS=Object.freeze(['.rbxl','.rbxlx']);
const PUBLISH_LIMITED_INSTANCE_TYPES=Object.freeze(['EditableImage','EditableMesh','PartOperation','SurfaceAppearance','BaseWrap']);

export const ROBLOX_PLATFORM_POLICY=Object.freeze({
  version:1,
  platform:'ROBLOX',
  roadmapPhase:'ROBLOX_FAST_RELEASE_STABILIZATION',
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
  positiveExperienceRequires:Object.freeze(['VERIFIED_WINNER','RUNTIME_PASS','INDEPENDENT_QA_PASS','REGRESSION_PASS','PROTECTED_STATE_PRESERVED','EXACT_REVISION']),
  canonicalDistillationOnly:true,
});

export function createRobloxPlatformContract(){
  return Object.freeze({
    ...ROBLOX_PLATFORM_POLICY,
    qa:Object.freeze({browserQa:'NOT_APPLICABLE',runtime:'PASS',independentQa:'PASS',saveRejoinCheck:'WHEN_APPLICABLE',mobileUiCheck:'WHEN_APPLICABLE',serverClientBoundaryCheck:true,remoteSecurityCheck:true}),
    publishing:Object.freeze({method:'POST',endpointTemplate:'https://apis.roblox.com/universes/v1/{universeId}/places/{placeId}/versions?versionType=Published',apiKeyHeader:'x-api-key',secretPersisted:false,secretPrinted:false,liveExecutionRequiresExplicitFlag:true,placeFileMustRemainUnderSourceRoot:true}),
    learning:Object.freeze({separateCron:false,separateDataset:false,separateTrainer:false,useExistingCanonicalDistillation:true}),
    authority:'roblox-platform-adapter-contract',
  });
}

export function validateRobloxSourcePath(sourcePath=''){
  const normalized=clean(sourcePath).replaceAll('\\','/');
  const ext=path.posix.extname(normalized).toLowerCase();
  const underRoot=normalized.startsWith(ROBLOX_PLATFORM_POLICY.sourceRoot);
  const extensionAllowed=ROBLOX_SOURCE_EXTENSIONS.includes(ext);
  return Object.freeze({pass:Boolean(normalized)&&underRoot&&extensionAllowed,path:normalized,extension:ext,underRoot,extensionAllowed,allowedExtensions:ROBLOX_SOURCE_EXTENSIONS});
}

export function validateRobloxReleaseEvidence(evidence={},sourceRevision=''){
  const blocked=[];
  const revision=clean(sourceRevision||evidence.sourceRevision);
  if(!SHA.test(revision))blocked.push('source-revision-invalid');
  if(clean(evidence.sourceRevision)!==revision)blocked.push('exact-source-revision-mismatch');
  if(evidence.runtimePassed!==true&&upper(evidence.runtime)!=='PASS')blocked.push('runtime-not-passed');
  if(evidence.independentQaPassed!==true&&upper(evidence.independentQa)!=='PASS')blocked.push('independent-qa-not-passed');
  if(evidence.regressionPassed!==true)blocked.push('regression-not-passed');
  if(evidence.protectedStatePreserved!==true)blocked.push('protected-state-unproven');
  if(evidence.exactRevision!==true)blocked.push('exact-revision-unproven');
  return Object.freeze({pass:blocked.length===0,sourceRevision:revision,blockedReasons:Object.freeze(blocked),browserQa:'NOT_APPLICABLE',authority:'roblox-release-evidence-gate'});
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

export async function publishRobloxPlace({plan,apiKey=process.env.ROBLOX_OPEN_CLOUD_API_KEY,fetchImpl=globalThis.fetch,readFile=fs.readFileSync}={}){
  if(plan?.authority!=='roblox-place-publish-plan')throw new Error('validated Roblox publish plan required');
  if(plan.executionReady!==true)throw new Error(`Roblox publish blocked: ${(plan.blockedReasons||[]).join(',')}`);
  const secret=clean(apiKey);
  if(!secret)throw new Error('ROBLOX_OPEN_CLOUD_API_KEY required for live publish');
  if(typeof fetchImpl!=='function')throw new Error('fetch implementation unavailable');
  const body=readFile(plan.placeFile);
  const response=await fetchImpl(plan.endpoint,{method:'POST',headers:{'x-api-key':secret,'Content-Type':plan.contentType},body});
  const text=await response.text();
  let payload=null;
  try{payload=text?JSON.parse(text):null;}catch{payload={raw:text.slice(0,1000)};}
  if(!response.ok){
    const safePayload=redactSecret(JSON.stringify(payload),secret);
    throw new Error(`Roblox publish failed HTTP ${response.status}: ${safePayload}`);
  }
  const versionNumber=Number(payload?.versionNumber);
  if(!Number.isInteger(versionNumber)||versionNumber<=0)throw new Error('Roblox publish response missing versionNumber');
  return Object.freeze({version:1,state:'PUBLISHED',platform:'ROBLOX',versionNumber,sourceRevision:plan.sourceRevision,placeFile:plan.placeFile,endpoint:plan.endpoint,credentialPersisted:false,authority:'roblox-place-publish-result'});
}

function parseArgs(argv){const args={};for(let i=0;i<argv.length;i+=1){const arg=argv[i];if(!arg.startsWith('--'))continue;const [key,inline]=arg.slice(2).split('=',2);if(key==='execute'){args.execute=true;continue;}args[key]=inline??argv[++i];}return args;}
function readJson(file){return JSON.parse(fs.readFileSync(file,'utf8'));}
async function main(){
  const args=parseArgs(process.argv.slice(2));
  const evidence=args.evidence?readJson(args.evidence):{};
  const plan=createRobloxPlacePublishPlan({
    placeFile:args['place-file'],
    universeId:args['universe-id']||process.env.ROBLOX_UNIVERSE_ID,
    placeId:args['place-id']||process.env.ROBLOX_PLACE_ID,
    sourceRevision:args['source-revision'],
    evidence,
  });
  if(args.execute!==true){console.log(JSON.stringify(plan,null,2));if(!plan.executionReady)process.exitCode=2;return;}
  const result=await publishRobloxPlace({plan});
  console.log(JSON.stringify(result,null,2));
}

const isMain=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(isMain){main().catch(error=>{console.error(error.message);process.exitCode=1;});}
