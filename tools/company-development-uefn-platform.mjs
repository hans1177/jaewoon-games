import {normalizeCommonEvidence} from './company-selected-platform-router.mjs';

export const UEFN_DEVELOPMENT_PLATFORM=Object.freeze({
  version:1,
  platform:'FORTNITE_UEFN',
  taskType:'fortnite_uefn',
  sourceRoot:'uefn-games/',
  existingExecutionPath:null,
  canonicalEvidenceFile:'uefn-technical-validation.json',
  buildOncePerSourceFingerprint:true,
  immutableArtifactRequired:true,
  sameArtifactAcrossRuntimeQaRegression:true,
  resumeExactFailurePoint:true,
  cronRole:'WATCHDOG_AND_RECOVERY_ONLY',
  parallelPipeline:false,
  runtimeExecutionConfigured:false,
});

export function createUefnDevelopmentPlatformContract(){
  return Object.freeze({...UEFN_DEVELOPMENT_PLATFORM,qualityGateWeakeningAllowed:false,authority:'uefn-development-platform-adapter'});
}

export function normalizeUefnDevelopmentEvidence(evidence={},defaults={}){
  return normalizeCommonEvidence({...evidence,platform:'FORTNITE_UEFN'},{...defaults,platform:'FORTNITE_UEFN'});
}
