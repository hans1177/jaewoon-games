// 파일명: assets/vibe-company-orchestration-bridge.js
// 역할: 재운컴퍼니 개발 플로우를 기존 workbench/orchestrator 실행계약에 연결한다.
// 원칙: 새 게임은 사전기획/시험/내부평가/사용자 승인 전 본개발 금지. 승인 외 단계는 회사가 자동 배정하고 기존 보호 규칙을 유지한다.
// 동기화: 바이브2 제작 규칙과 재운컴퍼니 운영 상태는 같은 GitHub main을 단일 진실 소스로 사용한다.

import { planVibeWorkbenchTask } from './vibe-workbench.js';
import { createVibeWorkPlan, createVibeExecutionContract } from './vibe-orchestrator.js';
import { createDepartmentExperienceState, createExperienceAwareInstruction } from './department-experience.js';
import { DEFAULT_DEPARTMENT_EXPERIENCE_STATE } from './department-experience-state.js';
import { createCompanyQualityBar } from './company-quality-bar.js';
import {
  COMPANY_FLOW_STAGES,
  COMPANY_REVIEW_ROLES,
  createCompanyFlow,
  createCompanyProposal,
  createDepartmentReview,
  summarizeInternalReview,
  createOwnerDevelopmentGate,
  classifyCompanyProposalApproval
} from './vibe-company-development-flow.js';

const clean=value=>String(value??'').trim();
const freezeList=value=>Object.freeze(Array.isArray(value)?[...value]:[]);
const has=(value,words)=>{const text=clean(value).toLowerCase();return words.some(word=>text.includes(String(word).toLowerCase()));};
const OWNER_GATE_STAGE='owner-approval';

export const VIBE2_COMPANY_SYNC=Object.freeze({
  version:4,
  mode:'single-source-of-truth',
  sourceOfTruth:'github-main',
  companyAuthority:Object.freeze(['company-directive.json','company-status.json','department-experience.json','COMPANY_FLOW.md']),
  vibe2Authority:Object.freeze(['AGENTS.md','ASSET_RULES.md','assets/animated-assets.json','assets/asset-manifest.json','assets/department-experience.js','assets/department-experience-state.js','assets/company-quality-bar.js','assets/vibe-workbench.js','assets/vibe-orchestrator.js']),
  bridge:'assets/vibe-company-orchestration-bridge.js',
  ownerDirectivePriority:'before-autonomous-plan',
  departmentLearning:'verified-experience-strengthens-quality-not-authority',
  qualityLearning:'company-quality-bar-rises-with-verified-experience',
  homepagePublication:'explicit-owner-instruction-only',
  webArchive:'read-only',
  paidAutomation:'forbidden'
});

const STAGE_ASSIGNMENTS=Object.freeze({
  brief:['planning'],
  'core-fun':['planning','balance'],
  'world-story':['planning'],
  storyboard:['planning','graphics'],
  systems:['planning','development','balance'],
  'technical-architecture':['development'],
  'technical-spike':['development','qa'],
  'playable-draft':['planning','development','qa','graphics','balance'],
  'internal-review':['planning','development','qa','graphics','balance'],
  'owner-approval':['director'],
  'full-development':['development'],
  'system-complete':['development','qa','balance'],
  'graphics-upgrade':['graphics','development','qa'],
  'integrated-qa':['qa','planning','development','graphics','balance'],
  optimization:['development','qa','graphics'],
  'android-build':['development','qa','release']
});

function isNewGameRequest(request){
  return has(request,['새 게임','신작','게임 만들어','게임 만들','게임 제작','새 프로젝트','처음부터 만들어','프로토타입 만들어']);
}
function inferTarget(request,target='auto'){
  if(['unity','godot','web'].includes(target))return target;
  if(has(request,['unity','유니티','apk','aab','urp','c#','안드로이드 빌드']))return'unity';
  if(has(request,['godot','고도','gdscript','project.godot']))return'godot';
  return'web';
}
function stageById(stageId){return COMPANY_FLOW_STAGES.find(stage=>stage.id===stageId)||COMPANY_FLOW_STAGES[0];}
function nextStageId(stageId){
  const index=COMPANY_FLOW_STAGES.findIndex(stage=>stage.id===stageId);
  if(index<0)return COMPANY_FLOW_STAGES[0].id;
  return COMPANY_FLOW_STAGES[Math.min(index+1,COMPANY_FLOW_STAGES.length-1)].id;
}
function normalizeReviews(reviews=[]){
  return reviews.map(review=>createDepartmentReview(review));
}
function resolveExperienceState(state){
  return createDepartmentExperienceState(state||DEFAULT_DEPARTMENT_EXPERIENCE_STATE);
}

export function createCompanyStageAssignment({stageId='brief',request='',gameId='',departmentExperienceState=null}={}){
  const stage=stageById(stageId);
  const roles=STAGE_ASSIGNMENTS[stage.id]||['director'];
  const requiresOwnerAction=stage.id===OWNER_GATE_STAGE;
  const experienceState=resolveExperienceState(departmentExperienceState);
  const tasks=roles.map(role=>{
    const baseInstruction=`${stage.name}: ${stage.purpose}`;
    const experienced=createExperienceAwareInstruction({department:role,baseInstruction,state:experienceState});
    return Object.freeze({
      role,
      stageId:stage.id,
      instruction:experienced.instruction,
      request:clean(request),
      outputs:stage.outputs,
      experience:experienced.profile
    });
  });
  const experienceProfiles=Object.freeze(Object.fromEntries(tasks.map(task=>[task.role,task.experience])));

  return Object.freeze({
    version:3,
    sync:VIBE2_COMPANY_SYNC,
    gameId:clean(gameId),
    stage,
    roles:freezeList(roles),
    tasks:freezeList(tasks),
    experienceProfiles,
    authority:requiresOwnerAction?'owner-decision-only':'company-managed-stage',
    autoExecute:!requiresOwnerAction,
    requiresOwnerAction,
    executionMode:requiresOwnerAction?'wait-for-owner':'company-managed'
  });
}

export function submitCompanyBidirectionalProposal({
  sourceRole='',targetRole='director',direction='bottom-up',category='implementation',summary='',reason='',evidence=[],impact='medium',estimatedCost='unknown'
}={}){
  const proposal=createCompanyProposal({sourceRole,targetRole,direction,category,summary,reason,evidence,impact,estimatedCost});
  return Object.freeze({sync:VIBE2_COMPANY_SYNC,proposal,approval:classifyCompanyProposalApproval(proposal)});
}

export function planCompanyDevelopmentTask({
  request='',
  target='auto',
  gameId=null,
  file=null,
  responsibleFiles=[],
  knownBroken=false,
  stageId='',
  revisionRoundsUsed=0,
  maxRevisionRounds=2,
  departmentReviews=[],
  departmentExperienceState=null,
  ownerDecision='PENDING',
  ownerNotes=''
}={}){
  const prompt=clean(request);
  if(!prompt)throw new Error('company development request required');

  const experienceState=resolveExperienceState(departmentExperienceState);
  const companyQualityBar=createCompanyQualityBar(experienceState);
  const resolvedTarget=inferTarget(prompt,target);
  const newGame=isNewGameRequest(prompt);
  const workbench=planVibeWorkbenchTask({request:prompt,target:resolvedTarget,gameId,file,knownBroken});
  const majorOwnerApprovalRequired=Boolean(workbench.companyDevelopment?.proposalApproval?.requiresOwnerApproval);
  const orchestratorBase=createVibeWorkPlan({
    request:prompt,
    target:resolvedTarget==='unity'?'auto':resolvedTarget,
    gameId,
    file,
    knownBroken
  });
  const orchestrator=resolvedTarget==='unity'
    ? Object.freeze({
        ...orchestratorBase,
        target:'unity',
        candidateFiles:workbench.candidateFiles,
        warnings:Object.freeze([...(orchestratorBase.warnings||[]),'Unity 대상 경로는 company bridge/workbench가 직접 관리']),
        compatibilityAdapter:'company-unity-target'
      })
    : orchestratorBase;

  const flow=createCompanyFlow({gameId:gameId||'',maxRevisionRounds});
  const requestedStage=clean(stageId)||flow.currentStage;
  const currentStage=stageById(requestedStage);
  const assignment=createCompanyStageAssignment({
    stageId:currentStage.id,
    request:prompt,
    gameId:gameId||'',
    departmentExperienceState:experienceState
  });

  let reviewSummary=null;
  let ownerGate=null;
  const reviews=normalizeReviews(departmentReviews);
  if(currentStage.id==='internal-review'||currentStage.id===OWNER_GATE_STAGE||reviews.length){
    reviewSummary=summarizeInternalReview({reviews,revisionRoundsUsed,maxRevisionRounds});
  }
  if(currentStage.id===OWNER_GATE_STAGE||ownerDecision!=='PENDING'){
    ownerGate=createOwnerDevelopmentGate({internalReview:reviewSummary,ownerDecision,notes:ownerNotes});
  }

  const maintenanceBypass=!newGame&&!majorOwnerApprovalRequired&&['repair','change','feature'].includes(workbench.mode);
  const fullDevelopmentApproved=Boolean(ownerGate?.approvedForFullDevelopment);
  const postGateStage=['full-development','system-complete','graphics-upgrade','integrated-qa','optimization','android-build'].includes(currentStage.id);
  const mayCreateExecutionContract=maintenanceBypass||fullDevelopmentApproved||postGateStage;

  let execution=null;
  if(mayCreateExecutionContract){
    const executionBase=createVibeExecutionContract({request:prompt,target:resolvedTarget==='unity'?'auto':resolvedTarget,responsibleFiles});
    const qualityBarChecks=[`회사 품질바 T${companyQualityBar.tier} ${companyQualityBar.name}: ${JSON.stringify(companyQualityBar.requirements)}`];
    const experienceQa=assignment.tasks.flatMap(task=>{
      const profile=task.experience;
      const checks=[`${task.role} LV${profile.level}: 근거 ${profile.evidenceMinimum}개 이상`];
      if(profile.peerReviewRequired)checks.push(`${task.role}: 교차검토 완료`);
      if(profile.adversarialSelfReview)checks.push(`${task.role}: 반례/실패 시나리오 검증`);
      return checks;
    });
    execution=resolvedTarget==='unity'
      ? Object.freeze({
          ...executionBase,
          target:'unity',
          responsibleFiles:Object.freeze(responsibleFiles.map(clean).filter(Boolean)),
          qa:Object.freeze([...(executionBase.qa||[]),...qualityBarChecks,...experienceQa,'Unity 컴파일','씬/프리팹 참조','Android 빌드','실기기 실행']),
          compatibilityAdapter:'company-unity-target'
        })
      : Object.freeze({
          ...executionBase,
          qa:Object.freeze([...(executionBase.qa||[]),...qualityBarChecks,...experienceQa])
        });
  }

  let next=currentStage.id;
  if(reviewSummary?.decision==='REVISE')next='playable-draft';
  else if(reviewSummary?.decision==='DROP')next='DROP';
  else if(ownerGate?.approvedForFullDevelopment)next='full-development';
  else if(ownerGate?.ownerDecision==='REVISE')next='playable-draft';
  else if(ownerGate?.ownerDecision==='DROP')next='DROP';
  else if(currentStage.id!==OWNER_GATE_STAGE)next=nextStageId(currentStage.id);

  return Object.freeze({
    version:4,
    sync:VIBE2_COMPANY_SYNC,
    request:prompt,
    gameId:gameId?clean(gameId):null,
    target:resolvedTarget,
    newGame,
    departmentExperience:experienceState,
    qualityBar:companyQualityBar,
    flow:Object.freeze({...flow,currentStage:currentStage.id,revisionRoundsUsed:Math.max(0,Number(revisionRoundsUsed)||0)}),
    stage:currentStage,
    assignment,
    workbench,
    orchestrator,
    internalReview:reviewSummary,
    ownerGate,
    execution,
    routing:Object.freeze({
      predevelopmentGateRequired:newGame,
      majorOwnerApprovalRequired,
      maintenanceBypass,
      mayDispatch:assignment.autoExecute,
      mayExecute:Boolean(execution),
      requiresOwnerAction:assignment.requiresOwnerAction,
      executionMode:assignment.executionMode,
      next,
      companyReviewRoles:COMPANY_REVIEW_ROLES,
      departmentExperienceRule:'verified-xp-strengthens-quality-process-without-expanding-authority',
      rule:newGame?'new-game-must-pass-internal-and-owner-gates':majorOwnerApprovalRequired?'major-change-must-pass-owner-gate':'existing-game-protection-flow'
    })
  });
}

if(typeof window!=='undefined'){
  window.VIBE2_COMPANY_SYNC=VIBE2_COMPANY_SYNC;
  window.planJaewoonCompanyDevelopmentTask=planCompanyDevelopmentTask;
  window.createJaewoonCompanyStageAssignment=createCompanyStageAssignment;
  window.submitJaewoonCompanyProposal=submitCompanyBidirectionalProposal;
}
