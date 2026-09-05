// 파일명: assets/vibe-v2-runtime.js
// 역할: Vibe Maker V2 코어를 하나의 검증 가능한 End-to-End 실행 계약으로 연결
// 원칙: 분석/후보/검증 단계만 조율하며 실제 소스 변경과 게임 결과 권한은 기존 책임 엔진에 둔다.
import {createVibeGoalContract} from './vibe-orchestrator.js';
import {createVibeDevelopmentAIContract,createVibeDevelopmentAIEvidenceGate} from './vibe-development-ai.js';
import {diagnoseVibeReplayRegression,createVibeAutoRepairPlan,validateVibeAutoRepairResult} from './vibe-quality-intelligence.js';

const freeze=v=>{if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.freeze(v);for(const x of Object.values(v))freeze(x)}return v};
const text=v=>String(v??'').trim();

export function createVibeV2Execution({request='',target='auto',environment='chatgpt',revision='',checkpointId='',responsibleFiles=[]}={}){
 const goal=createVibeGoalContract({request,target});
 const developmentAI=createVibeDevelopmentAIContract({environment,purpose:'diagnosis'});
 const files=[...new Set((responsibleFiles||[]).map(text).filter(Boolean))].sort();
 const blocked=[];
 if(!text(revision))blocked.push('exact-revision-required');
 if(!text(checkpointId))blocked.push('checkpoint-required');
 if(!files.length)blocked.push('responsible-source-unproven');
 return freeze({version:1,goal,developmentAI,revision:text(revision),checkpointId:text(checkpointId),responsibleFiles:files,readyForCandidate:blocked.length===0,blockedReasons:blocked,phase:'analyze',authority:'v2-orchestration-only',sourceMutationAllowed:false,gameplayMutationAllowed:false});
}

export function advanceVibeV2Candidate(execution,{candidate={},evidence={}}={}){
 if(execution?.authority!=='v2-orchestration-only')throw new Error('v2 execution contract required');
 if(!execution.readyForCandidate)return freeze({...execution,phase:'blocked',candidate:null,evidenceGate:null});
 const evidenceGate=createVibeDevelopmentAIEvidenceGate(candidate,{...evidence,responsibleSource:execution.responsibleFiles.length>0,checkpoint:Boolean(execution.checkpointId),exactRevision:Boolean(execution.revision)});
 return freeze({...execution,phase:evidenceGate.eligible?'candidate-verified':'candidate-rejected',candidate,evidenceGate,mayRun:evidenceGate.eligible,authority:'v2-orchestration-only'});
}

export function verifyVibeV2Runtime(execution,{baseline=null,candidateWorld=null,invariants={},qaPassed=false}={}){
 if(execution?.authority!=='v2-orchestration-only')throw new Error('v2 execution contract required');
 if(execution?.phase!=='candidate-verified')return freeze({...execution,phase:'runtime-blocked',mayCommit:false,rollbackRequired:true});
 const diagnosis=diagnoseVibeReplayRegression({baseline,candidate:candidateWorld,invariants});
 if(diagnosis.regressionFree&&qaPassed)return freeze({...execution,phase:'verified',diagnosis,qaPassed:true,mayCommit:true,rollbackRequired:false,completionAuthority:'verified-runtime-and-regression-only'});
 const repairPlan=createVibeAutoRepairPlan({diagnosis,responsibleFiles:execution.responsibleFiles,checkpointId:execution.checkpointId,revision:execution.revision});
 return freeze({...execution,phase:'repair-required',diagnosis,qaPassed:Boolean(qaPassed),repairPlan,mayCommit:false,rollbackRequired:true,completionAuthority:'verified-runtime-and-regression-only'});
}

export function verifyVibeV2Repair(execution,{before=null,after=null,invariants={},qaPassed=false,exactRevision=false}={}){
 if(execution?.phase!=='repair-required'||!execution.repairPlan)throw new Error('repair-required execution expected');
 const repairValidation=validateVibeAutoRepairResult({plan:execution.repairPlan,before,after,invariants,qaPassed,exactRevision});
 return freeze({...execution,phase:repairValidation.accepted?'verified':'rollback',repairValidation,mayCommit:repairValidation.mayCommit,rollbackRequired:repairValidation.rollbackRequired,completionAuthority:'verified-runtime-and-regression-only'});
}

if(typeof window!=='undefined')Object.assign(window,{createJaewoonVibeV2Execution:createVibeV2Execution,advanceJaewoonVibeV2Candidate:advanceVibeV2Candidate,verifyJaewoonVibeV2Runtime:verifyVibeV2Runtime,verifyJaewoonVibeV2Repair:verifyVibeV2Repair});
