// 파일명: tools/vibe3-trajectory-ingest.mjs
// 역할: Vibe3 성공/실패 후보 trajectory 중 완전 검증된 winner만 기존 training-samples 체인으로 승격한다.
// 원칙: 실패 후보는 비교 문맥으로 보존하되 학습 정답으로 승격하지 않는다.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { qaEvidencePasses, qaRequirementsForTask } from './vibe2-training-sample.mjs';

const SAFE_ID=/^[A-Za-z0-9._-]+$/;
const SHA=/^[0-9a-f]{7,40}$/i;
const TASK_TYPES=new Set(['coding','bugfix','unity','roblox','qa','planning','general']);
const clean=value=>String(value??'').trim();
const upper=value=>clean(value).toUpperCase();
const clamp01=value=>Math.max(0,Math.min(1,Number(value)||0));

function readJson(file){try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return null;}}
function listFiles(root){if(!fs.existsSync(root))return[];return fs.readdirSync(root).filter(name=>name.endsWith('.json')).map(name=>path.join(root,name)).sort();}

export function validateVibe3Trajectory(record={}){
  const blocked=[];
  const metadata=record.metadata||{};
  const finalEvidence=record.finalEvidence||{};
  const taskType=clean(metadata.taskType).toLowerCase();
  const project=clean(metadata.project||metadata.gameId);
  const sourceRevision=clean(metadata.sourceRevision);
  const winnerOutput=clean(metadata.winnerOutput);
  const selected=clean(record.selectedCandidateId);
  const winner=(record.candidates||[]).find(item=>clean(item?.id)===selected);
  const independentQa=upper(finalEvidence.independentQa||'PASS');
  const browserQa=upper(finalEvidence.browserQa||((taskType==='unity'||taskType==='roblox')?'NOT_APPLICABLE':'PASS'));
  const runtime=upper(finalEvidence.runtime||'PASS');
  if(Number(record.version)!==1)blocked.push('trajectory-version');
  if(clean(record.authority)!=='verified-development-trajectory')blocked.push('trajectory-authority');
  if(clean(record.outcome)!=='VERIFIED_WINNER')blocked.push('winner-not-verified');
  if(record.learningUse?.positiveWinnerAllowed!==true)blocked.push('positive-learning-not-allowed');
  if(!clean(record.request))blocked.push('request-missing');
  if(!selected||!winner||winner.eligible!==true)blocked.push('eligible-winner-missing');
  if(!TASK_TYPES.has(taskType))blocked.push('task-type-invalid');
  if(!project)blocked.push('project-missing');
  if(!SHA.test(sourceRevision))blocked.push('source-revision-invalid');
  if(!winnerOutput)blocked.push('winner-output-missing');
  if(finalEvidence.runtimePassed!==true)blocked.push('runtime-not-passed');
  if(finalEvidence.qaPassed!==true)blocked.push('qa-not-passed');
  if(finalEvidence.regressionPassed!==true)blocked.push('regression-not-passed');
  if(finalEvidence.exactRevision!==true)blocked.push('exact-revision-unproven');
  if(finalEvidence.protectedStatePreserved!==true)blocked.push('protected-state-unproven');
  if(!qaEvidencePasses({taskType,independentQa,browserQa,runtime}))blocked.push('canonical-qa-gate-rejected');
  return Object.freeze({pass:blocked.length===0,blockedReasons:Object.freeze(blocked),taskType,project,sourceRevision,winnerOutput,independentQa,browserQa,runtime,winner});
}

function sampleFromTrajectory(record,validation,sourceFile){
  const failed=(record.candidates||[]).filter(item=>item.eligible!==true).map(item=>({id:clean(item.id),blockedReasons:Array.isArray(item.blockedReasons)?item.blockedReasons:[],failure:clean(item.failure)||null}));
  const input=JSON.stringify({
    sourceGraphDigest:record.sourceGraphDigest||null,
    selectedCandidateId:record.selectedCandidateId,
    failedCandidates:failed,
    repairAttempts:Array.isArray(record.repairAttempts)?record.repairAttempts:[],
    evidenceBoundary:'OBSERVABLE_ACTIONS_AND_VERIFICATION_ONLY',
  },null,2);
  return {
    version:3,
    instruction:clean(record.request),
    input,
    output:validation.winnerOutput,
    taskType:validation.taskType,
    difficulty:validation.taskType==='bugfix'?'bug':validation.taskType==='unity'?'unity-build':validation.taskType==='roblox'?'roblox-release':'regression',
    lifecycle:'active',
    sourceKind:'vibe3-trajectory',
    project:validation.project,
    gameId:clean(record.metadata?.gameId)||null,
    candidateId:clean(record.selectedCandidateId),
    sourceCommit:validation.sourceRevision,
    sourceRevision:validation.sourceRevision,
    independentQa:validation.independentQa,
    browserQa:validation.browserQa,
    quality:{codeQuality:1,noRegression:true,playImprovement:clamp01(record.metadata?.playerImpactScore??1),ruleCompliance:1,trajectoryEvidence:1},
    provenance:{sourceKind:'vibe3-trajectory',sourceRevision:validation.sourceRevision,gameId:clean(record.metadata?.gameId)||null,candidateId:clean(record.selectedCandidateId),trajectoryId:clean(record.trajectoryId),trajectoryFile:sourceFile},
    verification:{independentQa:validation.independentQa,browserQa:validation.browserQa,runtime:validation.runtime,fullRegression:'PASS',exactRevision:'PASS',protectedState:'PASS',requirements:qaRequirementsForTask(validation.taskType)},
  };
}

export function ingestVibe3Trajectories({trajectoryDir='company-learning/vibe3-trajectories',outDir='company-learning/training-samples'}={}){
  fs.mkdirSync(outDir,{recursive:true});
  const result={version:1,examined:0,written:[],refreshed:[],skipped:[]};
  for(const file of listFiles(trajectoryDir)){
    result.examined+=1;
    const record=readJson(file);
    if(!record){result.skipped.push({file,reason:'INVALID_JSON'});continue;}
    const validation=validateVibe3Trajectory(record);
    if(!validation.pass){result.skipped.push({file,reason:'TRAJECTORY_GATE_REJECTED',blockedReasons:[...validation.blockedReasons]});continue;}
    const trajectoryId=clean(record.trajectoryId);
    if(!SAFE_ID.test(trajectoryId)){result.skipped.push({file,reason:'INVALID_TRAJECTORY_ID'});continue;}
    const outFile=path.join(outDir,`vibe3-${trajectoryId}.json`);
    const existing=readJson(outFile);
    if(existing?.provenance?.sourceRevision===validation.sourceRevision&&existing?.provenance?.trajectoryId===trajectoryId){result.skipped.push({file,reason:'ALREADY_CURRENT'});continue;}
    const sample=sampleFromTrajectory(record,validation,file.replaceAll('\\','/'));
    fs.writeFileSync(outFile,`${JSON.stringify(sample,null,2)}\n`);
    const item={trajectoryId,taskType:sample.taskType,project:sample.project,sourceRevision:sample.sourceRevision,outFile};
    if(existing)result.refreshed.push(item);else result.written.push(item);
  }
  return result;
}

function parseArgs(argv){const args={};for(let i=0;i<argv.length;i+=1){const arg=argv[i];if(!arg.startsWith('--'))continue;const [key,inline]=arg.slice(2).split('=',2);args[key]=inline??argv[++i];}return args;}
function main(){const args=parseArgs(process.argv.slice(2));console.log(JSON.stringify(ingestVibe3Trajectories({trajectoryDir:args['trajectory-dir']||'company-learning/vibe3-trajectories',outDir:args['out-dir']||'company-learning/training-samples'})));}
const isMain=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(isMain){try{main();}catch(error){console.error(error.message);process.exitCode=1;}}
