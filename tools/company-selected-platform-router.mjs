import crypto from 'node:crypto';

const clean=value=>String(value??'').trim();
const upper=value=>clean(value).toUpperCase();

export const SELECTED_PLATFORMS=Object.freeze(['ROBLOX','UNITY','FORTNITE_UEFN']);
export const SPEED_EXECUTION_STAGES=Object.freeze([
  'CHANGE_DETECTION',
  'CHEAP_PRECHECK',
  'REPRESENTATIVE_CANARY',
  'SINGLE_BUILD_OR_PACKAGE',
  'IMMUTABLE_ARTIFACT_BIND',
  'TARGET_PLATFORM_RUNTIME',
  'INDEPENDENT_QA',
  'REGRESSION',
  'IMMEDIATE_NEXT_STAGE_DISPATCH',
]);

export const PLATFORM_EXECUTION_ADAPTERS=Object.freeze({
  ROBLOX:Object.freeze({
    platform:'ROBLOX',
    taskType:'roblox',
    sourceRoot:'roblox-games/',
    adapterPath:'tools/vibe3-roblox-platform.mjs',
    evidenceFile:'roblox-technical-validation.json',
    projectField:'robloxProjectPath',
    existingExecutionPath:'.github/workflows/company-development-roblox-runtime.yml',
  }),
  UNITY:Object.freeze({
    platform:'UNITY',
    taskType:'unity',
    sourceRoot:'unity-games/',
    adapterPath:'tools/company-development-unity-platform.mjs',
    evidenceFile:'unity-technical-validation.json',
    projectField:'unityProjectPath',
    existingExecutionPath:'.github/workflows/company-development-unity-runtime.yml',
  }),
  FORTNITE_UEFN:Object.freeze({
    platform:'FORTNITE_UEFN',
    taskType:'fortnite_uefn',
    sourceRoot:'uefn-games/',
    adapterPath:'tools/company-development-uefn-platform.mjs',
    evidenceFile:'uefn-technical-validation.json',
    projectField:'uefnProjectPath',
    existingExecutionPath:null,
  }),
});

const PLATFORM_ALIASES=Object.freeze({
  ROBLOX:'ROBLOX',
  UNITY:'UNITY',
  UNITY_ANDROID:'UNITY',
  'UNITY-ANDROID':'UNITY',
  ANDROID_MOBILE:'UNITY',
  'ANDROID-MOBILE':'UNITY',
  FORTNITE_UEFN:'FORTNITE_UEFN',
  UEFN:'FORTNITE_UEFN',
  FORTNITE:'FORTNITE_UEFN',
});

export function normalizeSelectedPlatform(value=''){
  return PLATFORM_ALIASES[upper(value)]||null;
}

export function resolveSelectedPlatform(...sources){
  for(const source of sources){
    if(source==null)continue;
    if(typeof source==='string'){
      const platform=normalizeSelectedPlatform(source);
      if(platform)return platform;
      continue;
    }
    const candidates=[
      source.selectedPlatform,
      source.targetPlatform,
      source.initialTargetPlatform,
      source.INITIAL_TARGET_PLATFORM,
      source.platform,
      source.preferredPlatform,
    ];
    for(const candidate of candidates){
      const platform=normalizeSelectedPlatform(candidate);
      if(platform)return platform;
    }
  }
  return null;
}

export function adapterForPlatform(value){
  const platform=normalizeSelectedPlatform(value);
  if(!platform)return null;
  return PLATFORM_EXECUTION_ADAPTERS[platform]||null;
}

export function canonicalTargetWaitingState(){
  return 'WAITING_TARGET_PLATFORM_VALIDATION';
}

export function canonicalTargetRevalidationState(){
  return 'WAITING_TARGET_PLATFORM_REVALIDATION';
}

export function canonicalTargetStep(){
  return 'TARGET_PLATFORM_TECHNICAL_VALIDATION';
}

export function sourceFingerprint({platform,sourceRevision='',dependencyFingerprint='',buildConfigFingerprint=''}={}){
  const normalized=normalizeSelectedPlatform(platform);
  if(!normalized)throw new Error(`unsupported selected platform: ${platform}`);
  return crypto.createHash('sha256').update(JSON.stringify({
    platform:normalized,
    sourceRevision:clean(sourceRevision),
    dependencyFingerprint:clean(dependencyFingerprint),
    buildConfigFingerprint:clean(buildConfigFingerprint),
  })).digest('hex');
}

export function failureSignature({stage='',code='',message=''}={}){
  const normalizedStage=upper(stage);
  const normalizedCode=upper(code);
  const normalizedMessage=normalizedCode==='STAGE_NOT_PASSED'
    ? 'COMMON_STAGE_NOT_PASSED'
    : clean(message)
      .replace(/[0-9a-f]{7,40}/gi,'<REV>')
      .replace(/\d+/g,'<N>')
      .replace(/[a-z0-9]+(?:-[a-z0-9]+){2,}/gi,'<ID>')
      .slice(0,500);
  return crypto.createHash('sha256').update(JSON.stringify({stage:normalizedStage,code:normalizedCode,message:normalizedMessage})).digest('hex');
}

export function normalizeCommonEvidence(evidence={},defaults={}){
  const platform=resolveSelectedPlatform(evidence,defaults);
  const value={
    version:1,
    platform,
    sourceRevision:clean(evidence.sourceRevision||defaults.sourceRevision)||null,
    sourceFingerprint:clean(evidence.sourceFingerprint||defaults.sourceFingerprint)||null,
    buildOrPackagePassed:evidence.buildOrPackagePassed===true,
    artifactIdentity:clean(evidence.artifactIdentity||defaults.artifactIdentity)||null,
    runtimePassed:evidence.runtimePassed===true,
    independentQaPassed:evidence.independentQaPassed===true,
    regressionPassed:evidence.regressionPassed===true,
    exactRevision:evidence.exactRevision===true,
    lastSuccessfulStage:upper(evidence.lastSuccessfulStage||defaults.lastSuccessfulStage)||null,
    failureStage:upper(evidence.failureStage||defaults.failureStage)||null,
    failureSignature:clean(evidence.failureSignature||defaults.failureSignature)||null,
  };
  return Object.freeze(value);
}

function nextStageAfter(lastSuccessfulStage){
  const stage=upper(lastSuccessfulStage);
  if(!stage)return 'CHANGE_DETECTION';
  const index=SPEED_EXECUTION_STAGES.indexOf(stage);
  if(index<0)return 'CHANGE_DETECTION';
  return SPEED_EXECUTION_STAGES[Math.min(index+1,SPEED_EXECUTION_STAGES.length-1)];
}

export function resumeStageForEvidence(previousEvidence={},currentFingerprint=''){
  const evidence=normalizeCommonEvidence(previousEvidence);
  if(!currentFingerprint||evidence.sourceFingerprint!==currentFingerprint)return 'CHANGE_DETECTION';
  if(evidence.failureStage&&SPEED_EXECUTION_STAGES.includes(evidence.failureStage))return evidence.failureStage;
  return nextStageAfter(evidence.lastSuccessfulStage);
}

export function cheapPrecheck({selectedPlatform,sourceRevision='',sourcePath=''}={}){
  const platform=normalizeSelectedPlatform(selectedPlatform);
  const adapter=platform?PLATFORM_EXECUTION_ADAPTERS[platform]:null;
  const revision=clean(sourceRevision);
  const path=clean(sourcePath).replaceAll('\\','/');
  const errors=[];
  if(!platform)errors.push('selected-platform-invalid');
  if(!revision)errors.push('source-revision-missing');
  if(!adapter)errors.push('platform-adapter-missing');
  if(path&&adapter?.sourceRoot&&!path.startsWith(adapter.sourceRoot)&&!path.startsWith('web-games/'))errors.push('source-path-platform-mismatch');
  return Object.freeze({pass:errors.length===0,platform,adapter,sourceRevision:revision||null,sourcePath:path||null,errors:Object.freeze(errors)});
}

export function createSelectedPlatformExecutionPlan({
  selectedPlatform,
  sourceRevision='',
  dependencyFingerprint='',
  buildConfigFingerprint='',
  sourcePath='',
  previousEvidence={},
  sharedExecutionContractChanged=false,
  commonFailureDetected=false,
}={}){
  const precheck=cheapPrecheck({selectedPlatform,sourceRevision,sourcePath});
  const platform=precheck.platform;
  const fingerprint=platform?sourceFingerprint({platform,sourceRevision,dependencyFingerprint,buildConfigFingerprint}):null;
  const previous=normalizeCommonEvidence(previousEvidence,{platform});
  const sameFingerprint=Boolean(fingerprint&&previous.sourceFingerprint===fingerprint);
  const artifactReusable=Boolean(
    sameFingerprint&&
    previous.buildOrPackagePassed===true&&
    previous.artifactIdentity&&
    previous.exactRevision===true
  );
  const canaryRequired=Boolean(sharedExecutionContractChanged||commonFailureDetected);
  const resumeStage=precheck.pass?resumeStageForEvidence(previous,fingerprint):'CHEAP_PRECHECK';
  return Object.freeze({
    version:1,
    platform,
    adapter:precheck.adapter,
    precheck,
    sourceFingerprint:fingerprint,
    sameFingerprint,
    canaryRequired,
    artifactReusable,
    buildRequired:!artifactReusable,
    resumeStage,
    canonicalQueueStep:canonicalTargetStep(),
    canonicalWaitingState:canonicalTargetWaitingState(),
    cronRole:'WATCHDOG_AND_RECOVERY_ONLY',
    qualityGateWeakeningAllowed:false,
  });
}

export function selectRepresentativeCanary(rows=[]){
  const eligible=rows.filter(Boolean).map(row=>({...row,selectedPlatform:resolveSelectedPlatform(row)})).filter(row=>row.selectedPlatform);
  if(!eligible.length)return null;
  eligible.sort((a,b)=>{
    const af=Number(a.failureCount||0),bf=Number(b.failureCount||0);
    if(af!==bf)return bf-af;
    const ap=SELECTED_PLATFORMS.indexOf(a.selectedPlatform),bp=SELECTED_PLATFORMS.indexOf(b.selectedPlatform);
    if(ap!==bp)return ap-bp;
    return clean(a.gameId).localeCompare(clean(b.gameId));
  });
  return Object.freeze(eligible[0]);
}

export function recordExecutionStage(evidence={},stage,{passed,artifactIdentity=null,failureCode='',failureMessage=''}={}){
  const normalized=normalizeCommonEvidence(evidence);
  const target=upper(stage);
  if(!SPEED_EXECUTION_STAGES.includes(target))throw new Error(`unknown execution stage: ${stage}`);
  const next={...normalized};
  if(passed===true){
    next.lastSuccessfulStage=target;
    next.failureStage=null;
    next.failureSignature=null;
    if(target==='SINGLE_BUILD_OR_PACKAGE')next.buildOrPackagePassed=true;
    if(target==='IMMUTABLE_ARTIFACT_BIND')next.artifactIdentity=clean(artifactIdentity||next.artifactIdentity)||null;
    if(target==='TARGET_PLATFORM_RUNTIME')next.runtimePassed=true;
    if(target==='INDEPENDENT_QA')next.independentQaPassed=true;
    if(target==='REGRESSION')next.regressionPassed=true;
  }else{
    next.failureStage=target;
    next.failureSignature=failureSignature({stage:target,code:failureCode,message:failureMessage});
  }
  return Object.freeze(next);
}
