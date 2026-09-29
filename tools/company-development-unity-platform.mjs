import {normalizeCommonEvidence} from './company-selected-platform-router.mjs';

export const UNITY_DEVELOPMENT_PLATFORM=Object.freeze({
  version:1,
  platform:'UNITY',
  taskType:'unity',
  sourceRoot:'unity-games/',
  existingExecutionPath:'.github/workflows/company-development-unity-runtime.yml',
  buildWorkflow:'.github/workflows/unity-cloud-android-test.yml',
  runtimeWorkflow:'.github/workflows/unity-android-runtime-smoke.yml',
  independentQaWorkflow:'.github/workflows/unity-android-independent-qa.yml',
  regressionWorkflow:'.github/workflows/vibe-regression.yml',
  canonicalEvidenceFile:'unity-technical-validation.json',
  buildOncePerSourceFingerprint:true,
  immutableArtifactRequired:true,
  sameArtifactAcrossRuntimeQaRegression:true,
  resumeExactFailurePoint:true,
  cronRole:'WATCHDOG_AND_RECOVERY_ONLY',
  parallelPipeline:false,
});

export function createUnityDevelopmentPlatformContract(){
  return Object.freeze({...UNITY_DEVELOPMENT_PLATFORM,qualityGateWeakeningAllowed:false,authority:'unity-development-platform-adapter'});
}

export function normalizeUnityDevelopmentEvidence(evidence={},defaults={}){
  return normalizeCommonEvidence({...evidence,platform:'UNITY'},{...defaults,platform:'UNITY'});
}
