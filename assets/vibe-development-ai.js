// 파일명: assets/vibe-development-ai.js
// 역할: Vibe Maker 개발 AI 참여 순서·무료 한도·권한 경계와 재운컴퍼니 작업 라우팅을 결정
// 규칙: 현재 ChatGPT 개발 환경에서는 GPT-5.6 Sol이 상위 개발 에이전트이며 외부 AI는 선택적 비권위 후보 제공자다.

import { planCompanyDevelopmentTask, submitCompanyBidirectionalProposal } from './vibe-company-orchestration-bridge.js';
import { createVibeV3ExecutionContract, createVibePumpModeContract } from './vibe-v3-engine.js';

const POLICY='AI_ASSISTED_DEVELOPMENT_ALLOWED_BUT_NON_AUTHORITATIVE';
const ENGINE_ONLY=Object.freeze(['hp','damage','waves','spawnInterval','countPerSpawn','rewards','dropRates','drops','gameplayFlow','saveMeaning','inventory-write','save-write','progression','collision','cooldown','quest-completion','quest-reward','stat-growth','spawn-count','combat-result']);
const ENGINE_KEY_ALIASES=Object.freeze({drops:'dropRates','drop-rates':'dropRates','spawn-count':'countPerSpawn','save-meaning':'saveMeaning','gameplay-flow':'gameplayFlow'});
const DEVELOPMENT_PURPOSES=new Set(['code-generation','code-edit','code-review','diagnosis','source-repair','build-plan','design-generation','quality-priority','visual-analysis','animation-analysis','qa-summary','story-design','world-design','character-design','candidate-generation','candidate-ranking','repair-loop']);
const PROVIDERS=Object.freeze([
 Object.freeze({id:'groq',model:'openai/gpt-oss-120b',priority:1,roles:Object.freeze(['code-analysis','diagnosis','reasoning','code-edit-candidate']),freeOnly:true}),
 Object.freeze({id:'mistral',model:'mistral-small-latest',priority:2,roles:Object.freeze(['story','worldbuilding','character','creative-concept','alternate-candidate']),freeOnly:true,fallbackOn:Object.freeze(['quota','rate-limit','429'])})
]);
const clean=v=>String(v??'').trim().toLowerCase();
const finite=(v,f=0)=>{const n=Number(v);return Number.isFinite(n)?n:f;};
const normalizeProtectedKey=key=>ENGINE_KEY_ALIASES[key]||key;
function findProtectedCandidateKeys(value,path='',seen=new Set(),found=new Set()){
 if(value===null||typeof value!=='object'||seen.has(value))return found;
 seen.add(value);
 for(const [rawKey,child] of Object.entries(value)){
  const key=normalizeProtectedKey(rawKey),next=path?`${path}.${rawKey}`:rawKey;
  if(ENGINE_ONLY.includes(rawKey)||ENGINE_ONLY.includes(key))found.add(key);
  findProtectedCandidateKeys(child,next,seen,found);
 }
 return found;
}
export function createVibeDevelopmentAIContract({environment='standalone',purpose='diagnosis'}={}){
 const env=clean(environment)||'standalone',p=clean(purpose),chatgpt=env==='chatgpt'||env==='chatgpt-connected';
 return Object.freeze({version:4,generation:'V3-PUMP',policy:POLICY,environment:env,purpose:p,allowed:DEVELOPMENT_PURPOSES.has(p),authoritative:false,orchestrator:chatgpt?'gpt-5.6-sol':'vibe-maker',externalAIRequired:false,externalAIUsage:chatgpt?'optional-free-candidate-assistant':'free-candidate-assistant',providers:PROVIDERS,paidFallback:false,geminiExcluded:true,engineAuthoritative:true,mustNotDecide:ENGINE_ONLY,protectedAliases:ENGINE_KEY_ALIASES,recursiveProtection:true,multiCandidateRequired:true,verifiedRagRequired:true,taskPlaybookRequired:true,selfRepairBounded:true,trajectoryLearning:true,stopWhen:Object.freeze(['paid-provider-required','protected-change-needs-user-authorization','verification-impossible'])});
}
export function selectVibeDevelopmentAI({environment='standalone',purpose='diagnosis',groq={available:true},mistral={available:true},preferExternal=false}={}){
 const contract=createVibeDevelopmentAIContract({environment,purpose});
 if(!contract.allowed)return Object.freeze({useAI:false,provider:null,reason:'purpose-not-allowed',contract});
 if(contract.orchestrator==='gpt-5.6-sol'&&!preferExternal)return Object.freeze({useAI:false,provider:null,reason:'chatgpt-is-primary-development-agent',contract});
 if(groq.available&&!groq.quotaExceeded&&!groq.rateLimited)return Object.freeze({useAI:true,provider:PROVIDERS[0],reason:'groq-primary-free',contract});
 const groqFallback=groq.quotaExceeded||groq.rateLimited||groq.status===429||groq.available===false;
 if(groqFallback&&mistral.available&&!mistral.quotaExceeded&&!mistral.rateLimited)return Object.freeze({useAI:true,provider:PROVIDERS[1],reason:'mistral-free-fallback',contract});
 return Object.freeze({useAI:false,provider:null,reason:'free-ai-unavailable-continue-with-primary',contract});
}
export function createVibePumpCandidatePlan({environment='standalone',candidateCount=5,teacherCandidateMax=2,groq={available:true},mistral={available:true}}={}){
 const count=Math.max(3,Math.min(5,Math.floor(finite(candidateCount,5)))),teacherMax=Math.max(0,Math.min(2,Math.floor(finite(teacherCandidateMax,2)))),teachers=[];
 if(teacherMax>0&&groq.available&&!groq.quotaExceeded&&!groq.rateLimited)teachers.push(Object.freeze({slot:'teacher-1',provider:PROVIDERS[0],authoritative:false,completionAuthority:false}));
 if(teachers.length<teacherMax&&mistral.available&&!mistral.quotaExceeded&&!mistral.rateLimited)teachers.push(Object.freeze({slot:`teacher-${teachers.length+1}`,provider:PROVIDERS[1],authoritative:false,completionAuthority:false}));
 const primaryCount=count-teachers.length,primary=Array.from({length:primaryCount},(_,index)=>Object.freeze({slot:`primary-${index+1}`,provider:clean(environment).startsWith('chatgpt')?'gpt-5.6-sol':'vibe-maker',authoritative:false,independentCandidate:true}));
 return Object.freeze({version:1,generation:'V3-PUMP',candidateCount:count,primary:Object.freeze(primary),teachers:Object.freeze(teachers),teacherCandidateMax:teacherMax,teacherFreeOnly:true,teacherMayDeclareComplete:false,paidFallback:false,allCandidatesRequireSameDeterministicVerification:true,authority:'candidate-generation-plan-only'});
}
export function validateVibeDevelopmentAICandidate(candidate={}){
 const touched=[...findProtectedCandidateKeys(candidate)].sort();
 return Object.freeze({valid:touched.length===0,touched:Object.freeze(touched),authority:'candidate-only',recursive:true,decision:touched.length?'reject-authoritative-ai-output':'validate-before-apply'});
}
export function createVibeDevelopmentAIEvidenceGate(candidate={},evidence={}){
 const validation=validateVibeDevelopmentAICandidate(candidate),responsibleSource=Boolean(evidence.responsibleSource),checkpoint=Boolean(evidence.checkpoint),candidateApplied=Boolean(evidence.candidateApplied),runtimeObserved=Boolean(evidence.runtimeObserved),qaPassed=Boolean(evidence.qaPassed),regressionPassed=Boolean(evidence.regressionPassed),exactRevision=Boolean(evidence.exactRevision),blocked=[];
 if(!validation.valid)blocked.push('protected-mutation');if(!responsibleSource)blocked.push('responsible-source-unproven');if(!checkpoint)blocked.push('checkpoint-required');if(!candidateApplied)blocked.push('candidate-not-applied');if(!runtimeObserved)blocked.push('runtime-not-observed');if(!qaPassed)blocked.push('qa-not-passed');if(!regressionPassed)blocked.push('regression-not-passed');if(!exactRevision)blocked.push('exact-revision-unproven');
 return Object.freeze({version:1,eligible:blocked.length===0,validation,evidence:Object.freeze({responsibleSource,checkpoint,candidateApplied,runtimeObserved,qaPassed,regressionPassed,exactRevision}),blockedReasons:Object.freeze(blocked),authority:'deterministic-evidence-gate',aiMayDeclareComplete:false,completionAuthority:'verified-runtime-and-regression-only'});
}
export function planVibeDevelopmentRequest(options={}){return planCompanyDevelopmentTask(options);}
export function createVibeDevelopmentPipeline({environment='standalone',request='',target='auto',gameId=null,file=null,responsibleFiles=[],knownBroken=false,stageId='',revisionRoundsUsed=0,maxRevisionRounds=2,departmentReviews=[],ownerDecision='PENDING',ownerNotes='',candidateCount=5,maxRepairAttempts=3,minWinnerScore=0.78,groq={available:true},mistral={available:true}}={}){
 const chatgpt=clean(environment).startsWith('chatgpt');
 const companyPlan=String(request||'').trim()?planCompanyDevelopmentTask({request,target,gameId,file,responsibleFiles,knownBroken,stageId,revisionRoundsUsed,maxRevisionRounds,departmentReviews,ownerDecision,ownerNotes}):null;
 const companySteps=companyPlan?['company-request-routing',...(companyPlan.routing.predevelopmentGateRequired?['company-predevelopment-gate']:[]),...(companyPlan.routing.majorOwnerApprovalRequired&&!companyPlan.routing.predevelopmentGateRequired?['company-major-change-owner-gate']:[]),'department-assignment']:[];
 const v3=createVibeV3ExecutionContract({candidateCount,maxRepairAttempts,minWinnerScore}),pump=createVibePumpModeContract({candidateCount,maxRepairAttempts}),candidatePlan=createVibePumpCandidatePlan({environment,candidateCount,groq,mistral});
 const intelligenceSteps=['build-source-dependency-graph','v3-verified-rag','v3-failure-memory','v3-task-playbook','rank-responsible-source','generate-3-to-5-independent-candidates','optional-free-teacher-candidates','isolated-candidate-execution','deterministic-candidate-tournament','bounded-failure-repair-loop'];
 const executionSteps=chatgpt?['gpt-5.6-sol-analysis','vibe-maker-protection',...intelligenceSteps,'deterministic-validation','checkpoint','winner-source-apply','runtime-observation','run-qa','regression-check','exact-revision-evidence','persist-success-and-failure-trajectory','refresh-v3-memory-index']:['vibe-maker-analysis',...intelligenceSteps,'deterministic-validation','checkpoint','winner-source-apply','runtime-observation','run-qa','regression-check','exact-revision-evidence','persist-success-and-failure-trajectory','refresh-v3-memory-index'];
 return Object.freeze({version:5,generation:'V3-PUMP',environment,steps:Object.freeze(['user-direction',...companySteps,...executionSteps]),companyPlan,v3,pump,candidatePlan,executionAllowed:companyPlan?companyPlan.routing.mayExecute:null,externalAIRequired:false,localWeightTrainingRequired:false,finalAuthority:'deterministic-vibe-engine',completionGate:'deterministic-evidence-gate',policy:POLICY});
}
if(typeof window!=='undefined')Object.assign(window,{createJaewoonVibeDevelopmentAIContract:createVibeDevelopmentAIContract,selectJaewoonVibeDevelopmentAI:selectVibeDevelopmentAI,createJaewoonVibePumpCandidatePlan:createVibePumpCandidatePlan,validateJaewoonVibeDevelopmentAICandidate:validateVibeDevelopmentAICandidate,createJaewoonVibeDevelopmentAIEvidenceGate:createVibeDevelopmentAIEvidenceGate,createJaewoonVibeDevelopmentPipeline:createVibeDevelopmentPipeline,planJaewoonVibeDevelopmentRequest:planVibeDevelopmentRequest,submitJaewoonCompanyProposal:submitCompanyBidirectionalProposal});
