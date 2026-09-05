// 파일명: assets/vibe-v2-runtime.js
// 역할: Vibe Maker V2 코어를 하나의 검증 가능한 End-to-End 실행 계약으로 연결
// 원칙: 분석/후보/검증 단계만 조율하며 실제 소스 변경과 게임 결과 권한은 기존 책임 엔진에 둔다.
import {createVibeGoalContract} from './vibe-orchestrator.js';
import {createVibeDevelopmentAIContract,createVibeDevelopmentAIEvidenceGate,validateVibeDevelopmentAICandidate} from './vibe-development-ai.js';
import {diagnoseVibeReplayRegression,createVibeAutoRepairPlan,validateVibeAutoRepairResult} from './vibe-quality-intelligence.js';

const freeze=v=>{if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.freeze(v);for(const x of Object.values(v))freeze(x)}return v};
const text=v=>String(v??'').trim();
const unique=v=>[...new Set((v||[]).map(text).filter(Boolean))].sort();
const fnv1a=value=>{let hash=0x811c9dc5;for(let i=0;i<value.length;i++){hash^=value.charCodeAt(i);hash=Math.imul(hash,0x01000193)}return(hash>>>0).toString(16).padStart(8,'0')};
export const createVibeSourceRevision=changes=>{const canonical=(changes||[]).filter(x=>x&&text(x.path)).map(x=>({path:text(x.path),source:String(x.current??x.before??'')})).sort((a,b)=>a.path.localeCompare(b.path)).map(x=>`${x.path.length}:${x.path}:${x.source.length}:${x.source}`).join('|');return canonical?`local:${fnv1a(canonical)}`:''};

export function createVibeV2Execution({request='',target='auto',environment='chatgpt',revision='',checkpointId='',responsibleFiles=[]}={}){
 const goal=createVibeGoalContract({request,target});
 const developmentAI=createVibeDevelopmentAIContract({environment,purpose:'diagnosis'});
 const files=unique(responsibleFiles);
 const blocked=[];
 if(!text(revision))blocked.push('exact-revision-required');
 if(!text(checkpointId))blocked.push('checkpoint-required');
 if(!files.length)blocked.push('responsible-source-unproven');
 return freeze({version:2,goal,developmentAI,revision:text(revision),checkpointId:text(checkpointId),responsibleFiles:files,readyForCandidate:blocked.length===0,blockedReasons:blocked,phase:'analyze',authority:'v2-orchestration-only',sourceMutationAllowed:false,gameplayMutationAllowed:false});
}

export function createVibeWorkbenchCandidate({request='',target='auto',revision='',checkpointId='',changes=[]}={}){
 const normalized=(changes||[]).filter(x=>x&&x.changed!==false&&text(x.path)).map(x=>({path:text(x.path),before:String(x.current??''),after:String(x.next??'')}));
 const sourceRevision=createVibeSourceRevision(normalized);
 const exactRevision=sourceRevision||text(revision);
 const exactCheckpoint=sourceRevision?`checkpoint:${sourceRevision.slice('local:'.length)}`:text(checkpointId);
 const execution=createVibeV2Execution({request,target,revision:exactRevision,checkpointId:exactCheckpoint,responsibleFiles:normalized.map(x=>x.path)});
 const candidate={kind:'workbench-source-change',files:normalized.map(x=>({path:x.path,changed:x.before!==x.after})),protectedMutations:[]};
 const preflight=advanceVibeV2Candidate(execution,{candidate});
 return freeze({version:2,execution:preflight,candidate,files:normalized,sourceRevision:exactRevision,checkpointId:exactCheckpoint,mayApply:preflight.mayRun===true,authority:'workbench-v2-bridge',requiresAtomicWrite:true,requiresPostApplyEvidence:true});
}

// 원자 쓰기 직후 책임 파일을 다시 읽은 결과를 V2가 신뢰할 수 있는 소스 증거로 정규화한다.
export function verifyVibeWorkbenchAppliedSources(bridge,{observedFiles=[]}={}){
 if(bridge?.authority!=='workbench-v2-bridge')throw new Error('workbench v2 bridge required');
 const expected=new Map((bridge.files||[]).map(x=>[text(x.path),String(x.after??'')]));
 const observed=new Map((observedFiles||[]).filter(x=>x&&text(x.path)).map(x=>[text(x.path),String(x.actual??x.source??'')]));
 const files=[...expected.entries()].map(([path,source])=>({path,observed:observed.has(path),exact:observed.has(path)&&observed.get(path)===source}));
 const missing=files.filter(x=>!x.observed).map(x=>x.path),mismatched=files.filter(x=>x.observed&&!x.exact).map(x=>x.path);
 return freeze({version:1,sourceRevision:bridge.sourceRevision||bridge.execution?.revision||'',checkpointId:bridge.checkpointId||bridge.execution?.checkpointId||'',files,sourceExact:files.length>0&&missing.length===0&&mismatched.length===0,candidateApplied:files.length>0&&missing.length===0&&mismatched.length===0,missing,mismatched,authority:'post-apply-source-observation'});
}

export function advanceVibeV2Candidate(execution,{candidate={}}={}){
 if(execution?.authority!=='v2-orchestration-only')throw new Error('v2 execution contract required');
 if(!execution.readyForCandidate)return freeze({...execution,phase:'blocked',candidate:null,candidateValidation:null,mayRun:false});
 const candidateValidation=validateVibeDevelopmentAICandidate(candidate);
 return freeze({...execution,phase:candidateValidation.valid?'candidate-verified':'candidate-rejected',candidate,candidateValidation,mayRun:candidateValidation.valid,authority:'v2-orchestration-only'});
}

export function verifyVibeV2Runtime(execution,{baseline=null,candidateWorld=null,invariants={},candidateApplied=false,runtimeObserved=false,qaPassed=false,regressionPassed=false,exactRevision=false}={}){
 if(execution?.authority!=='v2-orchestration-only')throw new Error('v2 execution contract required');
 if(execution?.phase!=='candidate-verified')return freeze({...execution,phase:'runtime-blocked',mayCommit:false,rollbackRequired:true});
 const diagnosis=diagnoseVibeReplayRegression({baseline,candidate:candidateWorld,invariants});
 const evidenceGate=createVibeDevelopmentAIEvidenceGate(execution.candidate,{responsibleSource:execution.responsibleFiles.length>0,checkpoint:Boolean(execution.checkpointId),candidateApplied:Boolean(candidateApplied),runtimeObserved:Boolean(runtimeObserved),qaPassed:Boolean(qaPassed),regressionPassed:Boolean(regressionPassed)&&diagnosis.regressionFree,exactRevision:Boolean(exactRevision)});
 if(diagnosis.regressionFree&&evidenceGate.eligible)return freeze({...execution,phase:'verified',diagnosis,evidenceGate,qaPassed:true,mayCommit:true,rollbackRequired:false,completionAuthority:'verified-runtime-and-regression-only'});
 const repairPlan=createVibeAutoRepairPlan({diagnosis,responsibleFiles:execution.responsibleFiles,checkpointId:execution.checkpointId,revision:execution.revision});
 return freeze({...execution,phase:'repair-required',diagnosis,evidenceGate,qaPassed:Boolean(qaPassed),repairPlan,mayCommit:false,rollbackRequired:true,completionAuthority:'verified-runtime-and-regression-only'});
}

export function verifyVibeV2Repair(execution,{before=null,after=null,invariants={},qaPassed=false,exactRevision=false}={}){
 if(execution?.phase!=='repair-required'||!execution.repairPlan)throw new Error('repair-required execution expected');
 const repairValidation=validateVibeAutoRepairResult({plan:execution.repairPlan,before,after,invariants,qaPassed,exactRevision});
 return freeze({...execution,phase:repairValidation.accepted?'verified':'rollback',repairValidation,mayCommit:repairValidation.mayCommit,rollbackRequired:repairValidation.rollbackRequired,completionAuthority:'verified-runtime-and-regression-only'});
}

if(typeof window!=='undefined')Object.assign(window,{createJaewoonVibeV2Execution:createVibeV2Execution,createJaewoonVibeSourceRevision:createVibeSourceRevision,createJaewoonVibeWorkbenchCandidate:createVibeWorkbenchCandidate,verifyJaewoonVibeWorkbenchAppliedSources:verifyVibeWorkbenchAppliedSources,advanceJaewoonVibeV2Candidate:advanceVibeV2Candidate,verifyJaewoonVibeV2Runtime:verifyVibeV2Runtime,verifyJaewoonVibeV2Repair:verifyVibeV2Repair});
