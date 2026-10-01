import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const cliValue=(name,fallback='')=>{
  const prefix=name+'=';
  const row=process.argv.slice(2).find(value=>String(value).startsWith(prefix));
  return row===undefined?fallback:String(row).slice(prefix.length);
};
const cliBool=(name,fallback=false)=>{
  const value=cliValue(name,'');
  if(!value)return fallback;
  return value.toLowerCase()==='true'||value==='1'||value.toLowerCase()==='yes';
};
const readJsonFile=file=>JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));
const technicalResultFiles=root=>{
  const files=[];
  const walk=dir=>{
    if(!fs.existsSync(dir))return;
    for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
      const full=path.join(dir,entry.name);
      if(entry.isDirectory())walk(full);
      else if(entry.isFile()&&entry.name.endsWith('.result.json'))files.push(full);
    }
  };
  walk(root);
  return files.sort();
};

export function applyRobloxTechnicalResults({queue,results=[],expected=[],stamp=new Date().toISOString()}={}){
  const rows=Array.isArray(results)?results.map(row=>JSON.parse(JSON.stringify(row))):[];
  const targets=Array.isArray(expected)?expected:[];
  const byId=new Map(rows.map(row=>[row.gameId,row]));
  for(const target of targets){
    if(!byId.has(target.gameId)){
      const missing={gameId:target.gameId,pass:false,sourcePath:target.sourcePath,sourceRevision:target.sourceRevision,failure:'roblox-package-result-missing'};
      rows.push(missing);
      byId.set(target.gameId,missing);
    }
  }
  const expectedById=new Map(targets.map(target=>[target.gameId,target]));
  let passCount=0,failCount=0,ignoredCount=0;
  for(const result of rows){
    const item=(queue.items||[]).find(row=>row.gameId===result.gameId);
    if(!item)throw new Error(`queue item missing during Roblox package persist: ${result.gameId}`);
    if(result.superseded===true){
      console.log(`ROBLOX_PACKAGE_SUPERSEDED_RESULT_IGNORED=${result.gameId}:${result.supersedeReason||'UNKNOWN'}`);
      ignoredCount++;
      continue;
    }
    const secondaryOwnerFocus=expectedById.get(result.gameId)?.secondaryOwnerFocus===true;
    const boundSourceRevision=String(secondaryOwnerFocus?item.ownerFocusRobloxSourceCommit:item.robloxSourceCommit||'').trim();
    const resultSourceRevision=String(result.sourceRevision||'').trim();
    if(boundSourceRevision!==resultSourceRevision){
      console.log(`ROBLOX_PACKAGE_STALE_RESULT_IGNORED=${result.gameId}:${resultSourceRevision||'MISSING'}:${boundSourceRevision||'MISSING'}`);
      ignoredCount++;
      continue;
    }
    if(secondaryOwnerFocus){
      if(result.pass===true&&String(result.artifactIdentity||'').startsWith('sha256:')){
        Object.assign(item,{
          ownerFocusRobloxBuildOrPackagePassed:true,ownerFocusRobloxBuildSourceRevision:result.sourceRevision,
          ownerFocusRobloxBuildArtifactIdentity:result.artifactIdentity,ownerFocusRobloxBuildPassedAt:stamp,ownerFocusRobloxBuildFailedAt:null,
          ownerFocusRobloxBuildPreflightPassed:false,ownerFocusRobloxBuildPreflightPassedAt:null,ownerFocusRobloxBuildPreflightFailedAt:null,
          ownerFocusRobloxRuntimePassed:false,ownerFocusRobloxRuntimePassedAt:null,ownerFocusRobloxRuntimeFailedAt:null,
          ownerFocusRobloxAssetPipelineState:'BUILD_READY',updatedAt:stamp,
        });
        passCount++;
      }else{
        Object.assign(item,{
          ownerFocusRobloxBuildOrPackagePassed:false,ownerFocusRobloxBuildSourceRevision:result.sourceRevision,
          ownerFocusRobloxBuildFailedAt:stamp,ownerFocusRobloxBuildPreflightPassed:false,
          ownerFocusRobloxRuntimePassed:false,ownerFocusRobloxAssetPipelineState:'BUILD_REPAIR_REQUIRED',
          ownerFocusRobloxBuildFailure:result.failure||'ROBLOX_BUILD_PACKAGE_FAILED',updatedAt:stamp,
        });
        failCount++;
      }
      continue;
    }
    if(result.pass===true&&String(result.artifactIdentity||'').startsWith('sha256:')){
      const preflightExact=result.preflightPass===true
        &&result.preflightEvidence?.sourceRevision===result.sourceRevision
        &&result.preflightEvidence?.artifactIdentity===result.artifactIdentity;
      const f0Exact=preflightExact&&result.f0Pass===true
        &&result.f0Evidence?.sourceRevision===result.sourceRevision
        &&result.f0Evidence?.artifactIdentity===result.artifactIdentity;
      Object.assign(item,{
        status:'ACTIVE',
        currentStep:f0Exact?'VIBE_INTERNAL_PLAY':preflightExact?'ROBLOX_F0_SOURCE_PREFLIGHT':'TARGET_PLATFORM_TECHNICAL_VALIDATION',
        canonicalState:f0Exact?'F0_SOURCE_PREFLIGHT_PASSED':preflightExact?'F0_SOURCE_PREFLIGHT_REPAIR_REQUIRED':'TARGET_PLATFORM_REPAIR_REQUIRED',
        robloxBuildOrPackagePassed:true,robloxBuildSourceRevision:result.sourceRevision,robloxBuildArtifactIdentity:result.artifactIdentity,
        robloxBuildPassedAt:stamp,robloxBuildFailedAt:null,
        robloxBuildPreflightPassed:preflightExact,robloxBuildPreflightPassedAt:preflightExact?stamp:null,robloxBuildPreflightFailedAt:preflightExact?null:stamp,robloxBuildPreflightEvidence:result.preflightEvidence||null,
        robloxFoundationF0Passed:f0Exact,robloxFoundationF0PassedAt:f0Exact?stamp:null,robloxFoundationF0Evidence:f0Exact?result.f0Evidence:null,
        robloxHeadlessFastMvpPassed:f0Exact,robloxHeadlessFastMvpEvidence:f0Exact?result.f0Evidence:null,robloxHeadlessFinalReviewPassed:false,
        robloxExactRevisionPassed:f0Exact,
        robloxRuntimeCandidateEvidence:null,robloxRuntimeFoundationPassed:false,robloxRuntimeFoundationEvidence:null,
        robloxRuntimePassed:false,robloxRuntimePassedAt:null,robloxRuntimeFailedAt:null,robloxRuntimeEvidence:null,robloxRuntimeRetryCount:0,
        robloxServerClientBoundaryPassed:false,robloxDatastoreRejoinPassed:false,robloxMobileControlUiPassed:false,
        robloxIndependentQaPassed:false,robloxIndependentQaPassedAt:null,robloxRegressionPassed:false,robloxRegressionPassedAt:null,
        robloxFinalReviewPassed:false,robloxFinalReviewPassedAt:null,robloxF9ReleaseRegressionPassed:false,robloxF9ReleaseRegressionEvidence:null,robloxPostRuntimeQaEvidence:null,
        robloxInternalReleaseReady:false,robloxInternalReleaseAt:null,
        robloxLastSuccessfulStage:f0Exact?'F0_SOURCE_PREFLIGHT':preflightExact?'VIBE_SHARED_MODEL_BUILD_PREFLIGHT':'TARGET_PLATFORM_BUILD_OR_PACKAGE',
        robloxFailureStage:f0Exact?'VIBE_INTERNAL_PLAY':preflightExact?'F0_SOURCE_INTEGRITY':'VIBE_SHARED_MODEL_BUILD_PREFLIGHT',
        robloxFailureSignature:f0Exact?'ROBLOX_STUDIO_INTERNAL_VALIDATION_PENDING':preflightExact?'ROBLOX_F0_SOURCE_PREFLIGHT_FAILED':'ROBLOX_BUILD_PREFLIGHT_BLOCKED',
        routingBlockers:[f0Exact?'roblox-studio-internal-validation-pending':preflightExact?'roblox-f0-source-preflight-failed':'roblox-build-preflight-blocked'],
        updatedAt:stamp,
      });
      passCount++;
    }else{
      Object.assign(item,{
        status:'ACTIVE',currentStep:'TARGET_PLATFORM_TECHNICAL_VALIDATION',canonicalState:'TARGET_PLATFORM_REPAIR_REQUIRED',
        robloxBuildOrPackagePassed:false,robloxBuildSourceRevision:result.sourceRevision,robloxBuildFailedAt:stamp,
        robloxBuildPreflightPassed:false,robloxBuildPreflightPassedAt:null,robloxBuildPreflightFailedAt:null,robloxBuildPreflightEvidence:null,
        robloxFoundationF0Passed:false,robloxFoundationF0PassedAt:null,robloxFoundationF0Evidence:null,
        robloxHeadlessFastMvpPassed:false,robloxHeadlessFastMvpEvidence:null,robloxHeadlessFinalReviewPassed:false,
        robloxRuntimeCandidateEvidence:null,robloxRuntimeFoundationPassed:false,robloxRuntimeFoundationEvidence:null,
        robloxRuntimePassed:false,robloxRuntimePassedAt:null,robloxRuntimeFailedAt:null,robloxRuntimeEvidence:null,robloxRuntimeRetryCount:0,
        robloxServerClientBoundaryPassed:false,robloxDatastoreRejoinPassed:false,robloxMobileControlUiPassed:false,
        robloxIndependentQaPassed:false,robloxIndependentQaPassedAt:null,robloxRegressionPassed:false,robloxRegressionPassedAt:null,
        robloxFinalReviewPassed:false,robloxFinalReviewPassedAt:null,robloxF9ReleaseRegressionPassed:false,robloxF9ReleaseRegressionEvidence:null,robloxPostRuntimeQaEvidence:null,
        robloxInternalReleaseReady:false,robloxInternalReleaseAt:null,
        robloxFailureStage:'TARGET_PLATFORM_BUILD_OR_PACKAGE',robloxFailureSignature:result.failure||'ROBLOX_BUILD_PACKAGE_FAILED',
        routingBlockers:[`roblox-build-package:${result.failure||'ROBLOX_BUILD_PACKAGE_FAILED'}`],updatedAt:stamp,
      });
      failCount++;
    }
  }
  queue.robloxTechnicalParallelism=null;
  queue.developmentGameWipMax=null;
  queue.updatedAt=stamp;
  return {queue,passCount,failCount,ignoredCount};
}

if(process.argv.includes('--technical')){
  const technicalQueuePath=cliValue('--queue','development-queue.json');
  const technicalRoot=cliValue('--root','/tmp/roblox-technical/results');
  const gameId=cliValue('--game-id','');
  const expected=gameId?[{
    gameId,
    sourcePath:cliValue('--source-path',''),
    sourceRevision:cliValue('--source-revision',''),
    secondaryOwnerFocus:cliBool('--secondary-owner-focus',false),
  }]:JSON.parse(process.env.EXPECTED_TARGETS_JSON||'[]');
  const queue=readJsonFile(technicalQueuePath);
  const results=technicalResultFiles(technicalRoot).map(readJsonFile);
  const outcome=applyRobloxTechnicalResults({queue,results,expected});
  fs.writeFileSync(technicalQueuePath,JSON.stringify(outcome.queue,null,2)+'\n');
  console.log(`ROBLOX_BUILD_PACKAGE_PASS_COUNT=${outcome.passCount}`);
  console.log(`ROBLOX_BUILD_PACKAGE_FAIL_COUNT=${outcome.failCount}`);
  console.log(`ROBLOX_BUILD_PACKAGE_IGNORED_COUNT=${outcome.ignoredCount}`);
  console.log('DEVELOPMENT_GAME_ELIGIBILITY_CAP=NONE');
  console.log('ROBLOX_PER_GAME_PROMOTION=YES');
  console.log('ROBLOX_PROMOTION_COUNT_GATE=NONE');
  console.log('ROBLOX_RUNTIME_PASS=NO');
  console.log('ROBLOX_INDEPENDENT_QA_PASS=NO');
  console.log('ROBLOX_REGRESSION_PASS=NO');
  console.log('ROBLOX_FINAL_REVIEW_PASS=NO');
  console.log('ROBLOX_RELEASE_CLAIM=NO');
  process.exit(0);
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
const queuePath=process.argv[2]||'development-queue.json';
const root=process.argv[3]||'/tmp/roblox-runtime-batch';
const expected=JSON.parse(process.env.EXPECTED_TARGETS_JSON||'[]');
const queue=JSON.parse(fs.readFileSync(queuePath,'utf8').replace(/^\uFEFF/,''));
const resultFiles=[];
const walk=dir=>{
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const full=path.join(dir,entry.name);
    if(entry.isDirectory()) walk(full);
    else if(entry.isFile()&&entry.name.endsWith('.runtime.json')) resultFiles.push(full);
  }
};
if(fs.existsSync(root)) walk(root);
const results=resultFiles.sort().map(file=>JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,'')));
console.log(`ROBLOX_RUNTIME_CHECKPOINT_FILES=${resultFiles.length}`);
const byId=new Map(results.map(x=>[x.gameId,x]));
const stamp=new Date().toISOString();
let pass=0,fail=0;
for(const target of expected){
  const item=(queue.items||[]).find(x=>x.gameId===target.gameId);
  if(!item) throw new Error(`queue item missing: ${target.gameId}`);
  const r=byId.get(target.gameId);
  const secondaryOwnerFocus=target.secondaryOwnerFocus===true;
  const sourceRevision=secondaryOwnerFocus?item.ownerFocusRobloxSourceCommit:item.robloxSourceCommit;
  const artifactIdentity=secondaryOwnerFocus?item.ownerFocusRobloxBuildArtifactIdentity:item.robloxBuildArtifactIdentity;
  const exact=r?.sourceRevision===sourceRevision&&r?.artifactIdentity===artifactIdentity&&Boolean(r?.secondaryOwnerFocus)===secondaryOwnerFocus;
  const expectedHarness=String(target.runtimeHarnessVersion||'');
  const resultHarness=String(r?.runtimeHarnessVersion||'');
  const harnessExact=Boolean(expectedHarness)&&resultHarness===expectedHarness;
  if(secondaryOwnerFocus){
    if(r?.runtimePassed===true&&r?.actualStudioRuntime===true&&r?.serverClientBoundaryPassed===true&&exact&&harnessExact){
      Object.assign(item,{
        ownerFocusRobloxRuntimePassed:true,ownerFocusRobloxRuntimePassedAt:stamp,ownerFocusRobloxRuntimeFailedAt:null,ownerFocusRobloxRuntimeEvidence:r,
        ownerFocusRobloxRuntimeRetryCount:0,ownerFocusRobloxRuntimeHarnessVersion:resultHarness,ownerFocusRobloxServerClientBoundaryPassed:true,
        ownerFocusRobloxRuntimeSecurityHold:false,ownerFocusRobloxRuntimeSecurityHoldAt:null,
        ownerFocusRobloxDatastoreRejoinPassed:r.datastoreRejoinPassed===true,ownerFocusRobloxMobileControlUiPassed:r.mobileControlUiPassed===true,
        ownerFocusRobloxIndependentQaPassed:false,ownerFocusRobloxIndependentQaPassedAt:null,ownerFocusRobloxRegressionPassed:false,ownerFocusRobloxRegressionPassedAt:null,
        ownerFocusRobloxPostRuntimeQaEvidence:null,ownerFocusRobloxAssetPipelineState:'RUNTIME_READY',updatedAt:stamp,
      });
      pass++;
    }else{
      const failure=r?.failure||(!harnessExact?'ROBLOX_RUNTIME_HARNESS_MISMATCH':'ROBLOX_RUNTIME_RESULT_MISSING');
      const securityHold=['roblox-studio-authentication-required','roblox-studio-local-profile-unavailable'].includes(failure);
      const retryableFailure=!securityHold&&['roblox-studio-install-failed','roblox-studio-busy','roblox-studio-runtime-failed','roblox-studio-runtime-timeout','ROBLOX_RUNTIME_RESULT_MISSING'].includes(failure);
      const sameHarness=String(item.ownerFocusRobloxRuntimeHarnessVersion||'')===resultHarness;
      const baseRetryCount=sameHarness?Number(item.ownerFocusRobloxRuntimeRetryCount||0):0;
      const retryCount=retryableFailure?baseRetryCount+1:0;
      Object.assign(item,{
        ownerFocusRobloxRuntimePassed:false,ownerFocusRobloxRuntimeFailedAt:stamp,ownerFocusRobloxRuntimeEvidence:r||null,ownerFocusRobloxRuntimeRetryCount:retryCount,
        ownerFocusRobloxRuntimeHarnessVersion:resultHarness||expectedHarness,ownerFocusRobloxServerClientBoundaryPassed:false,
        ownerFocusRobloxRuntimeSecurityHold:securityHold,ownerFocusRobloxRuntimeSecurityHoldAt:securityHold?stamp:null,
        ownerFocusRobloxIndependentQaPassed:false,ownerFocusRobloxIndependentQaPassedAt:null,ownerFocusRobloxRegressionPassed:false,ownerFocusRobloxRegressionPassedAt:null,
        ownerFocusRobloxPostRuntimeQaEvidence:null,ownerFocusRobloxAssetPipelineState:securityHold?'RUNTIME_SECURITY_HOLD':'RUNTIME_REPAIR_REQUIRED',
        ownerFocusRobloxRuntimeFailure:failure,updatedAt:stamp,
      });
      fail++;
    }
    continue;
  }
  if(r?.runtimePassed===true&&r?.actualStudioRuntime===true&&r?.serverClientBoundaryPassed===true&&exact&&harnessExact){
    Object.assign(item,{
      robloxRuntimePassed:true,robloxRuntimePassedAt:stamp,robloxRuntimeFailedAt:null,robloxRuntimeEvidence:r,
      robloxRuntimeRetryCount:0,robloxRuntimeHarnessVersion:resultHarness,robloxServerClientBoundaryPassed:true,
      robloxRuntimeSecurityHold:false,robloxRuntimeSecurityHoldAt:null,
      robloxDatastoreRejoinPassed:r.datastoreRejoinPassed===true,robloxMobileControlUiPassed:r.mobileControlUiPassed===true,
      robloxIndependentQaPassed:false,robloxIndependentQaPassedAt:null,robloxRegressionPassed:false,robloxRegressionPassedAt:null,
      robloxFinalReviewPassed:false,robloxFinalReviewPassedAt:null,robloxPostRuntimeQaEvidence:null,
      robloxLastSuccessfulStage:'TARGET_PLATFORM_RUNTIME',robloxFailureStage:'INDEPENDENT_QA',
      robloxFailureSignature:'ROBLOX_INDEPENDENT_QA_PENDING',routingBlockers:['roblox-independent-qa-pending'],updatedAt:stamp,
    });
    pass++;
  }else{
    const failure=r?.failure||(!harnessExact?'ROBLOX_RUNTIME_HARNESS_MISMATCH':'ROBLOX_RUNTIME_RESULT_MISSING');
    const securityHold=['roblox-studio-authentication-required','roblox-studio-local-profile-unavailable'].includes(failure);
    const retryableFailure=!securityHold&&['roblox-studio-install-failed','roblox-studio-busy','roblox-studio-runtime-failed','roblox-studio-runtime-timeout','ROBLOX_RUNTIME_RESULT_MISSING'].includes(failure);
    const sameHarness=String(item.robloxRuntimeHarnessVersion||'')===resultHarness;
    const baseRetryCount=sameHarness?Number(item.robloxRuntimeRetryCount||0):0;
    const retryCount=retryableFailure?baseRetryCount+1:0;
    Object.assign(item,{
      robloxRuntimePassed:false,robloxRuntimeFailedAt:stamp,robloxRuntimeEvidence:r||null,robloxRuntimeRetryCount:retryCount,
      robloxRuntimeHarnessVersion:resultHarness||expectedHarness,robloxServerClientBoundaryPassed:false,
      robloxRuntimeSecurityHold:securityHold,robloxRuntimeSecurityHoldAt:securityHold?stamp:null,
      robloxIndependentQaPassed:false,robloxIndependentQaPassedAt:null,robloxRegressionPassed:false,robloxRegressionPassedAt:null,
      robloxFinalReviewPassed:false,robloxFinalReviewPassedAt:null,robloxPostRuntimeQaEvidence:null,
      robloxFailureStage:'TARGET_PLATFORM_RUNTIME',robloxFailureSignature:failure,
      routingBlockers:[securityHold?`roblox-runtime-security-hold:${failure}`:`roblox-runtime:${failure}`],updatedAt:stamp,
    });
    fail++;
  }
}
queue.updatedAt=stamp;
fs.writeFileSync(queuePath,JSON.stringify(queue,null,2)+'\n');
console.log(`ROBLOX_ACTUAL_RUNTIME_PASS_COUNT=${pass}`);
console.log(`ROBLOX_ACTUAL_RUNTIME_FAIL_COUNT=${fail}`);
console.log('ROBLOX_OTHER_GAME_PROMOTION_BLOCKED=NO');
console.log('ROBLOX_INDEPENDENT_QA_PASS=NO');
console.log('ROBLOX_REGRESSION_PASS=NO');
console.log('ROBLOX_FINAL_REVIEW_PASS=NO');
console.log('ROBLOX_RELEASE_CLAIM=NO');
console.log('ROBLOX_RUNTIME_SECURITY_HOLD_POLICY=AUTH_OR_LOCAL_PROFILE');
}
