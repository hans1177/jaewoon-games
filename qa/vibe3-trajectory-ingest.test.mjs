import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ingestVibe3Trajectories, validateVibe3Trajectory } from '../tools/vibe3-trajectory-ingest.mjs';
import { qaRequirementsForTask, qaEvidencePasses } from '../tools/vibe2-training-sample.mjs';
import { selectVibe3BaseModel } from '../tools/vibe3-model-selection.mjs';

const trajectory={
  version:1,
  trajectoryId:'traj_verified_001',
  request:'검증된 전투 버그를 책임 코드에서 수정하고 모바일 터치 저장 회귀를 확인한다',
  sourceGraphDigest:'graph-1',
  candidates:[
    {id:'bad',eligible:false,score:.4,blockedReasons:['runtime-failed'],failure:'runtime crash'},
    {id:'winner',eligible:true,score:.94,blockedReasons:[],failure:null},
  ],
  selectedCandidateId:'winner',
  repairAttempts:[{index:1,candidateId:'bad',pass:false,failure:'runtime crash'}],
  outcome:'VERIFIED_WINNER',
  finalEvidence:{runtimePassed:true,qaPassed:true,regressionPassed:true,exactRevision:true,protectedStatePreserved:true,independentQa:'PASS',browserQa:'PASS',runtime:'PASS'},
  metadata:{taskType:'bugfix',project:'qa-project',gameId:'qa-project',sourceRevision:'abcdef1234567890',sourcePaths:['web-games/qa-project/index.html'],winnerOutput:'diff --git a/web-games/qa-project/index.html b/web-games/qa-project/index.html\n+verified touch save fix',playerImpactScore:1},
  learningUse:{positiveWinnerAllowed:true,failedCandidatesPreserved:true,hiddenReasoningRequired:false,observableActionsAndEvidenceOnly:true},
  authority:'verified-development-trajectory',
};
assert.equal(validateVibe3Trajectory(trajectory).pass,true);
assert(validateVibe3Trajectory(trajectory).tags.includes('webgame'));
assert(validateVibe3Trajectory(trajectory).tags.includes('touch-input'));
assert(validateVibe3Trajectory(trajectory).tags.includes('save-load'));
const runtimeAlias=structuredClone(trajectory);delete runtimeAlias.finalEvidence.runtimePassed;runtimeAlias.finalEvidence.runtimePass=true;
assert.equal(validateVibe3Trajectory(runtimeAlias).pass,true);
const bad=structuredClone(trajectory);bad.finalEvidence.runtimePassed=false;bad.finalEvidence.runtimePass=false;
assert.equal(validateVibe3Trajectory(bad).pass,false);

const robloxTrajectory=structuredClone(trajectory);
robloxTrajectory.trajectoryId='traj_roblox_verified_001';
robloxTrajectory.request='Roblox 저장/재접속 동작을 수정하고 실제 런타임과 독립 QA로 검증한다';
robloxTrajectory.metadata.taskType='roblox';
robloxTrajectory.metadata.project='roblox-pilot';
robloxTrajectory.metadata.gameId='roblox-pilot';
robloxTrajectory.metadata.sourcePaths=['roblox-games/pilot/main.luau'];
robloxTrajectory.metadata.winnerOutput='diff --git a/roblox-games/pilot/main.luau b/roblox-games/pilot/main.luau\n+verified roblox fix';
robloxTrajectory.finalEvidence.browserQa='NOT_APPLICABLE';
assert.equal(validateVibe3Trajectory(robloxTrajectory).pass,true);
assert.deepEqual(qaRequirementsForTask('roblox'),{independentQa:'PASS',browserQa:'NOT_APPLICABLE',runtime:'PASS',androidRuntimeRequired:false,robloxRuntimeRequired:true,uefnRuntimeRequired:false});
assert.equal(qaEvidencePasses({taskType:'roblox',independentQa:'PASS',browserQa:'NOT_APPLICABLE',runtime:'PASS'}),true);
assert.equal(qaEvidencePasses({taskType:'roblox',independentQa:'FAIL',browserQa:'NOT_APPLICABLE',runtime:'PASS'}),false);
assert.equal(qaEvidencePasses({taskType:'roblox',independentQa:'PASS',browserQa:'NOT_APPLICABLE',runtime:'FAIL'}),false);
assert.deepEqual(qaRequirementsForTask('fortnite_uefn'),{independentQa:'PASS',browserQa:'NOT_APPLICABLE',runtime:'PASS',androidRuntimeRequired:false,robloxRuntimeRequired:false,uefnRuntimeRequired:true});
assert.equal(qaEvidencePasses({taskType:'fortnite_uefn',independentQa:'PASS',browserQa:'NOT_APPLICABLE',runtime:'PASS'}),true);
assert.equal(qaEvidencePasses({taskType:'fortnite_uefn',independentQa:'PASS',browserQa:'NOT_APPLICABLE',runtime:'FAIL'}),false);

const uefnTrajectory=structuredClone(trajectory);
uefnTrajectory.trajectoryId='traj_uefn_verified_001';
uefnTrajectory.request='UEFN Verse 수정 결과를 실제 런타임과 독립 QA로 검증한다';
uefnTrajectory.metadata.taskType='fortnite_uefn';
uefnTrajectory.metadata.project='uefn-pilot';
uefnTrajectory.metadata.gameId='uefn-pilot';
uefnTrajectory.metadata.sourcePaths=['fortnite-uefn-games/pilot/main.verse'];
uefnTrajectory.metadata.winnerOutput='diff --git a/fortnite-uefn-games/pilot/main.verse b/fortnite-uefn-games/pilot/main.verse\n+verified uefn fix';
uefnTrajectory.finalEvidence.browserQa='NOT_APPLICABLE';
assert.equal(validateVibe3Trajectory(uefnTrajectory).pass,true);

const root=fs.mkdtempSync(path.join(os.tmpdir(),'vibe3-trajectory-'));
const trajectoryDir=path.join(root,'trajectories');
const outDir=path.join(root,'samples');
fs.mkdirSync(trajectoryDir,{recursive:true});
fs.writeFileSync(path.join(trajectoryDir,'verified.json'),JSON.stringify(trajectory,null,2));
fs.writeFileSync(path.join(trajectoryDir,'roblox.json'),JSON.stringify(robloxTrajectory,null,2));
fs.writeFileSync(path.join(trajectoryDir,'uefn.json'),JSON.stringify(uefnTrajectory,null,2));
const result=ingestVibe3Trajectories({trajectoryDir,outDir});
assert.equal(result.version,2);
assert.equal(result.written.length,3);
const ordinaryResult=result.written.find(item=>item.trajectoryId==='traj_verified_001');
const robloxResult=result.written.find(item=>item.trajectoryId==='traj_roblox_verified_001');
const uefnResult=result.written.find(item=>item.trajectoryId==='traj_uefn_verified_001');
const sample=JSON.parse(fs.readFileSync(ordinaryResult.outFile,'utf8'));
assert.equal(sample.sourceKind,'vibe3-trajectory');
assert.equal(sample.taskType,'bugfix');
assert(sample.input.includes('runtime-failed'));
assert(sample.output.includes('verified touch save fix'));
assert(sample.tags.includes('webgame'));
assert(sample.tags.includes('touch-input'));
assert(sample.tags.includes('save-load'));
assert.equal(sample.provenance.portableContextMayCrossPlatforms,true);
assert.equal(sample.provenance.platformPassEvidenceTransferAllowed,false);
const robloxSample=JSON.parse(fs.readFileSync(robloxResult.outFile,'utf8'));
assert.equal(robloxSample.taskType,'roblox');
assert.equal(robloxSample.browserQa,'NOT_APPLICABLE');
assert.equal(robloxSample.verification.requirements.robloxRuntimeRequired,true);
assert.equal(robloxSample.verification.requirements.uefnRuntimeRequired,false);
assert.equal(robloxSample.difficulty,'roblox-release');
const uefnSample=JSON.parse(fs.readFileSync(uefnResult.outFile,'utf8'));
assert.equal(uefnSample.taskType,'fortnite_uefn');
assert.equal(uefnSample.browserQa,'NOT_APPLICABLE');
assert.equal(uefnSample.verification.requirements.uefnRuntimeRequired,true);
assert.equal(uefnSample.difficulty,'uefn-release');

const baseline=selectVibe3BaseModel({taskType:'coding',method:'qlora',cudaAvailable:true,cudaVramGiB:64,diskFreeGiB:100,enableCoderUpgrade:false,compatibilityProbePass:true,modelCachedOrDownloadApproved:true});
assert.equal(baseline.upgraded,false);
const upgraded=selectVibe3BaseModel({taskType:'coding',method:'qlora',cudaAvailable:true,cudaVramGiB:64,diskFreeGiB:100,enableCoderUpgrade:true,compatibilityProbePass:true,modelCachedOrDownloadApproved:true});
assert.equal(upgraded.upgraded,true);
assert.equal(upgraded.tier,'CODER_UPGRADE');
const blocked=selectVibe3BaseModel({taskType:'coding',method:'qlora',cudaAvailable:true,cudaVramGiB:16,diskFreeGiB:100,enableCoderUpgrade:true,compatibilityProbePass:true,modelCachedOrDownloadApproved:true});
assert.equal(blocked.upgraded,false);
assert(blocked.reasons.includes('insufficient-vram'));

console.log('PASS Vibe3 trajectory ingest including web portable tags, runtime aliases, Roblox/UEFN isolation, and capability-gated coder model selection');
