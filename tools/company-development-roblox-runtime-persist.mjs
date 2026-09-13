import fs from 'node:fs';
import path from 'node:path';

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
  const exact=r?.sourceRevision===item.robloxSourceCommit&&r?.artifactIdentity===item.robloxBuildArtifactIdentity;
  const expectedHarness=String(target.runtimeHarnessVersion||'');
  const resultHarness=String(r?.runtimeHarnessVersion||'');
  const harnessExact=Boolean(expectedHarness)&&resultHarness===expectedHarness;
  if(r?.runtimePassed===true&&r?.actualStudioRuntime===true&&r?.serverClientBoundaryPassed===true&&exact&&harnessExact){
    Object.assign(item,{
      robloxRuntimePassed:true,robloxRuntimePassedAt:stamp,robloxRuntimeFailedAt:null,robloxRuntimeEvidence:r,
      robloxRuntimeRetryCount:0,robloxRuntimeHarnessVersion:resultHarness,robloxServerClientBoundaryPassed:true,
      robloxDatastoreRejoinPassed:r.datastoreRejoinPassed===true,robloxMobileControlUiPassed:r.mobileControlUiPassed===true,
      robloxIndependentQaPassed:false,robloxIndependentQaPassedAt:null,robloxRegressionPassed:false,robloxRegressionPassedAt:null,
      robloxFinalReviewPassed:false,robloxFinalReviewPassedAt:null,robloxPostRuntimeQaEvidence:null,
      robloxLastSuccessfulStage:'TARGET_PLATFORM_RUNTIME',robloxFailureStage:'INDEPENDENT_QA',
      robloxFailureSignature:'ROBLOX_INDEPENDENT_QA_PENDING',routingBlockers:['roblox-independent-qa-pending'],updatedAt:stamp,
    });
    pass++;
  }else{
    const failure=r?.failure||(!harnessExact?'ROBLOX_RUNTIME_HARNESS_MISMATCH':'ROBLOX_RUNTIME_RESULT_MISSING');
    const retryableFailure=['roblox-studio-install-failed','roblox-studio-runtime-failed','roblox-studio-runtime-timeout','ROBLOX_RUNTIME_RESULT_MISSING'].includes(failure);
    const sameHarness=String(item.robloxRuntimeHarnessVersion||'')===resultHarness;
    const baseRetryCount=sameHarness?Number(item.robloxRuntimeRetryCount||0):0;
    const retryCount=retryableFailure?baseRetryCount+1:0;
    Object.assign(item,{
      robloxRuntimePassed:false,robloxRuntimeFailedAt:stamp,robloxRuntimeEvidence:r||null,robloxRuntimeRetryCount:retryCount,
      robloxRuntimeHarnessVersion:resultHarness||expectedHarness,robloxServerClientBoundaryPassed:false,
      robloxIndependentQaPassed:false,robloxIndependentQaPassedAt:null,robloxRegressionPassed:false,robloxRegressionPassedAt:null,
      robloxFinalReviewPassed:false,robloxFinalReviewPassedAt:null,robloxPostRuntimeQaEvidence:null,
      robloxFailureStage:'TARGET_PLATFORM_RUNTIME',robloxFailureSignature:failure,
      routingBlockers:[`roblox-runtime:${failure}`],updatedAt:stamp,
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
