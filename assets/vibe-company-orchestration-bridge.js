// 파일명: assets/vibe-company-orchestration-bridge.js
// 역할: 재운컴퍼니 개발 플로우를 기존 workbench/orchestrator 실행계약에 연결한다.
// 원칙: 완료 아트북은 컨셉 기준으로 잠그며 Vibe2는 재기획하지 않고 기술검증/구현/QA만 수행한다.
// 동기화: 바이브2 제작 규칙과 재운컴퍼니 운영 상태는 같은 GitHub main을 단일 진실 소스로 사용한다.

import { planVibeWorkbenchTask } from './vibe-workbench.js';
import { createVibeWorkPlan, createVibeExecutionContract } from './vibe-orchestrator.js';
import { createDepartmentExperienceState, createExperienceAwareInstruction } from './department-experience.js';
import { DEFAULT_DEPARTMENT_EXPERIENCE_STATE } from './department-experience-state.js';
import { createCompanyQualityBar } from './company-quality-bar.js';
import { VIBE_WORK_LOCK_STATE_BRANCH, VIBE_WORK_LOCK_STATE_PATH } from './vibe-work-lock.js';
import {
  COMPANY_FLOW_STAGES,
  COMPANY_REVIEW_ROLES,
  ARTBOOK_LOCKED_PREDESIGN_STAGES,
  createArtbookDevelopmentLock,
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

const SHARED_WORK_LOCK_POLICY=Object.freeze({
  requiredBeforeSourceWrite:true,
  stateBranch:VIBE_WORK_LOCK_STATE_BRANCH,
  statePath:VIBE_WORK_LOCK_STATE_PATH,
  worker:'company-ai',
  baseShaRequired:true,
  leaseMinutes:45,
  maxLeaseMinutes:120,
  activeOverlapRule:'block-source-write-and-select-independent-work',
  staleBaseOverlapRule:'REPLAN_REQUIRED',
  staleBaseNonOverlapRule:'REBASE_THEN_QA',
  authority:'edit-exclusivity-only-no-owner-gate-expansion'
});

export const VIBE2_COMPANY_SYNC=Object.freeze({
  version:5,
  mode:'single-source-of-truth',
  sourceOfTruth:'github-main',
  companyAuthority:Object.freeze(['company-directive.json','company-status.json','department-experience.json','COMPANY_FLOW.md','ARTBOOK_POLICY.md']),
  vibe2Authority:Object.freeze(['AGENTS.md','ASSET_RULES.md','assets/animated-assets.json','assets/asset-manifest.json','assets/department-experience.js','assets/department-experience-state.js','assets/company-quality-bar.js','assets/vibe-workbench.js','assets/vibe-orchestrator.js','assets/vibe-work-lock.js']),
  bridge:'assets/vibe-company-orchestration-bridge.js',
  ownerDirectivePriority:'before-autonomous-plan',
  completedArtbookPriority:'locked-source-of-truth-before-vibe2-plan',
  departmentLearning:'verified-experience-strengthens-quality-not-authority',
  qualityLearning:'company-quality-bar-rises-with-verified-experience',
  sharedWorkLock:'required-before-source-write',
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
function resolveArtbookLock({artbook=null,artbookStatus='',artbookCutCount=0,artbookPostprocessComplete=null,artbookRef=''}={}){
  const status=clean(artbookStatus||artbook?.status||'');
  const cutCount=Number(artbookCutCount)||Number(artbook?.cuts?.length)||Number(artbook?.postprocess?.cutCount)||0;
  const postprocessComplete=artbookPostprocessComplete===null||artbookPostprocessComplete===undefined
    ? Boolean(artbook?.postprocess?.complete)
    : Boolean(artbookPostprocessComplete);
  const ref=clean(artbookRef||artbook?.sourcePath||artbook?.path||artbook?.file||'');
  return createArtbookDevelopmentLock({status,cutCount,postprocessComplete,ref});
}

export function createCompanyStageAssignment({stageId='brief',request='',gameId='',departmentExperienceState=null,artbookLock=null}={}){
  const stage=stageById(stageId);
  const roles=STAGE_ASSIGNMENTS[stage.id]||['director'];
  const requiresOwnerAction=stage.id===OWNER_GATE_STAGE;
  const experienceState=resolveExperienceState(departmentExperienceState);
  const locked=artbookLock?.locked===true;
  const lockInstruction=locked
    ? `완료 아트북 잠금 적용. 기준=${artbookLock.ref||'completed-artbook'}. 장르·핵심루프·스토리·캐릭터/몬스터/보스 정체성·아트방향·전투/성장 핵심을 재설계하지 말 것. 변경 필요 시 구현하지 말고 ARTBOOK_CHANGE_REQUEST로 반환.`
    : '';
  const tasks=roles.map(role=>{
    const baseInstruction=[lockInstruction,`${stage.name}: ${stage.purpose}`].filter(Boolean).join(' ');
    const experienced=createExperienceAwareInstruction({department:role,baseInstruction,state:experienceState});
    return Object.freeze({
      role,
      stageId:stage.id,
      instruction:experienced.instruction,
      request:clean(request),
      outputs:stage.outputs,
      artbookLocked:locked,
      artbookRef:locked?artbookLock.ref||null:null,
      experience:experienced.profile,
      workLock:SHARED_WORK_LOCK_POLICY
    });
  });
  const experienceProfiles=Object.freeze(Object.fromEntries(tasks.map(task=>[task.role,task.experience])));

  return Object.freeze({
    version:4,
    sync:VIBE2_COMPANY_SYNC,
    gameId:clean(gameId),
    stage,
    roles:freezeList(roles),
    tasks:freezeList(tasks),
    experienceProfiles,
    artbookLock:artbookLock||null,
    workLock:SHARED_WORK_LOCK_POLICY,
    authority:requiresOwnerAction?'owner-decision-only':locked?'company-managed-with-locked-artbook':'company-managed-stage',
    autoExecute:!requiresOwnerAction,
    requiresOwnerAction,
    executionMode:requiresOwnerAction?'wait-for-owner':locked?'implementation-with-locked-artbook':'company-managed'
  });
}

export function submitCompanyBidirectionalProposal({
  sourceRole='',targetRole='director',direction='bottom-up',category='implementation',summary='',reason='',evidence=[],impact='medium',estimatedCost='unknown',artbookLocked=false
}={}){
  const proposal=createCompanyProposal({sourceRole,targetRole,direction,category,summary,reason,evidence,impact,estimatedCost,artbookLocked});
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
  ownerNotes='',
  artbook=null,
  artbookStatus='',
  artbookCutCount=0,
  artbookPostprocessComplete=null,
  artbookRef=''
}={}){
  const prompt=clean(request);
  if(!prompt)throw new Error('company development request required');

  const experienceState=resolveExperienceState(departmentExperienceState);
  const companyQualityBar=createCompanyQualityBar(experienceState);
  const resolvedTarget=inferTarget(prompt,target);
  const newGame=isNewGameRequest(prompt);
  const artbookLock=resolveArtbookLock({artbook,artbookStatus,artbookCutCount,artbookPostprocessComplete,artbookRef});
  const workbench=planVibeWorkbenchTask({
    request:prompt,
    target:resolvedTarget,
    gameId,
    file,
    knownBroken,
    artbook,
    artbookStatus:artbookLock.status,
    artbookCutCount:artbookLock.cutCount,
    artbookPostprocessComplete:artbookLock.postprocessComplete,
    artbookRef:artbookLock.ref
  });
  const majorOwnerApprovalRequired=Boolean(workbench.companyDevelopment?.proposalApproval?.requiresOwnerApproval);
  const orchestratorBase=createVibeWorkPlan({
    request:prompt,
    target:resolvedTarget==='unity'?'auto':resolvedTarget,
    gameId,
    file,
    knownBroken
  });
  const artbookWarnings=artbookLock.locked
    ? [`완료 아트북 잠금: ${artbookLock.ref||'completed-artbook'}를 단일 컨셉 기준으로 유지`,`Vibe2 재기획 금지. 변경 필요 시 ARTBOOK_CHANGE_REQUEST`]
    : [];
  const orchestrator=resolvedTarget==='unity'
    ? Object.freeze({
        ...orchestratorBase,
        target:'unity',
        candidateFiles:workbench.candidateFiles,
        warnings:Object.freeze([...(orchestratorBase.warnings||[]),...artbookWarnings,'Unity 대상 경로는 company bridge/workbench가 직접 관리']),
        compatibilityAdapter:'company-unity-target'
      })
    : Object.freeze({...orchestratorBase,warnings:Object.freeze([...(orchestratorBase.warnings||[]),...artbookWarnings])});

  const flow=createCompanyFlow({
    gameId:gameId||'',
    maxRevisionRounds,
    artbookStatus:artbookLock.status,
    artbookCutCount:artbookLock.cutCount,
    artbookPostprocessComplete:artbookLock.postprocessComplete,
    artbookRef:artbookLock.ref
  });
  const requestedStage=clean(stageId)||flow.currentStage;
  const effectiveStage=artbookLock.locked&&ARTBOOK_LOCKED_PREDESIGN_STAGES.includes(requestedStage)
    ? 'technical-architecture'
    : requestedStage;
  const currentStage=stageById(effectiveStage);
  const assignment=createCompanyStageAssignment({
    stageId:currentStage.id,
    request:prompt,
    gameId:gameId||'',
    departmentExperienceState:experienceState,
    artbookLock
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
    const artbookQa=artbookLock.locked
      ? ['완료 아트북 10장과 실제 구현의 컨셉 일치 검사','장르·핵심루프·스토리·아트방향·전투·성장 컨셉 드리프트 없음','잠긴 아트북 변경 필요 시 ARTBOOK_CHANGE_REQUEST로 중단했는지 확인']
      : [];
    const experienceQa=assignment.tasks.flatMap(task=>{
      const profile=task.experience;
      const checks=[`${task.role} LV${profile.level}: 근거 ${profile.evidenceMinimum}개 이상`];
      if(profile.peerReviewRequired)checks.push(`${task.role}: 교차검토 완료`);
      if(profile.adversarialSelfReview)checks.push(`${task.role}: 반례/실패 시나리오 검증`);
      return checks;
    });
    const workLockQa=['공용 Work Lock 획득 확인','BASE_SHA 이후 잠금 범위 변경 겹침 없음 또는 재계획 완료'];
    execution=resolvedTarget==='unity'
      ? Object.freeze({
          ...executionBase,
          target:'unity',
          responsibleFiles:Object.freeze(responsibleFiles.map(clean).filter(Boolean)),
          qa:Object.freeze([...(executionBase.qa||[]),...qualityBarChecks,...artbookQa,...experienceQa,...workLockQa,'Unity 컴파일','씬/프리팹 참조','Android 빌드','실기기 실행']),
          artbookLock,
          workLockRequired:true,
          compatibilityAdapter:'company-unity-target'
        })
      : Object.freeze({
          ...executionBase,
          qa:Object.freeze([...(executionBase.qa||[]),...qualityBarChecks,...artbookQa,...experienceQa,...workLockQa]),
          artbookLock,
          workLockRequired:true
        });
  }

  let next=currentStage.id;
  if(reviewSummary?.decision==='REVISE')next='playable-draft';
  else if(reviewSummary?.decision==='DROP')next='DROP';
  else if(ownerGate?.approvedForFullDevelopment)next='full-development';
  else if(ownerGate?.ownerDecision==='REVISE')next='playable-draft';
  else if(ownerGate?.ownerDecision==='DROP')next='DROP';
  else if(currentStage.id!==OWNER_GATE_STAGE)next=nextStageId(currentStage.id);

  const conceptPhaseRequired=newGame&&!artbookLock.locked;
  const explicitLockScope=responsibleFiles.map(clean).filter(Boolean);
  const fallbackLockScope=(workbench.candidateFiles||[]).map(clean).filter(Boolean);
  const workLock=Object.freeze({
    ...SHARED_WORK_LOCK_POLICY,
    requiredBeforeSourceWrite:Boolean(execution),
    acquired:false,
    gameId:gameId?clean(gameId):null,
    files:freezeList(explicitLockScope.length?explicitLockScope:fallbackLockScope),
    acquisitionState:'worker-must-acquire-before-source-write',
    releaseRule:'release-after-qa-or-abort'
  });

  return Object.freeze({
    version:5,
    sync:VIBE2_COMPANY_SYNC,
    request:prompt,
    gameId:gameId?clean(gameId):null,
    target:resolvedTarget,
    newGame,
    artbookLock,
    workLock,
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
      predevelopmentGateRequired:conceptPhaseRequired,
      completedArtbookLocked:artbookLock.locked,
      skippedRedesignStages:artbookLock.locked?ARTBOOK_LOCKED_PREDESIGN_STAGES:freezeList([]),
      conceptSource:artbookLock.locked?'completed-artbook':'company-predevelopment',
      conceptChangeRule:artbookLock.locked?'ARTBOOK_CHANGE_REQUEST_REQUIRED':'normal-proposal-flow',
      majorOwnerApprovalRequired,
      maintenanceBypass,
      mayDispatch:assignment.autoExecute,
      mayExecute:Boolean(execution),
      sharedWorkLockRequiredBeforeSourceWrite:Boolean(execution),
      requiresOwnerAction:assignment.requiresOwnerAction,
      executionMode:assignment.executionMode,
      next,
      companyReviewRoles:COMPANY_REVIEW_ROLES,
      departmentExperienceRule:'verified-xp-strengthens-quality-process-without-expanding-authority',
      rule:artbookLock.locked?'locked-artbook-is-source-of-truth-vibe2-implementation-only':newGame?'new-game-must-pass-internal-and-owner-gates':majorOwnerApprovalRequired?'major-change-must-pass-owner-gate':'existing-game-protection-flow'
    })
  });
}

if(typeof window!=='undefined'){
  window.VIBE2_COMPANY_SYNC=VIBE2_COMPANY_SYNC;
  window.planJaewoonCompanyDevelopmentTask=planCompanyDevelopmentTask;
  window.createJaewoonCompanyStageAssignment=createCompanyStageAssignment;
  window.submitJaewoonCompanyProposal=submitCompanyBidirectionalProposal;
}
