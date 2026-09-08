// 파일명: assets/vibe-company-development-flow.js
// 역할: 재운컴퍼니 게임 제작의 아트북 → Web 실험 → 내부평가 → JAY 게이트 → 본개발 흐름과 상/하향 제안 계약 정의
// 원칙: 게임개발 MAJOR 운영판정은 JAY/AI_CEO가 맡고, CEO/L5는 최종공개·파괴적·보안·비용 등 상위 게이트만 맡는다.

const freezeList=value=>Object.freeze(Array.isArray(value)?[...value]:[]);
const clean=value=>String(value??'').trim();
const asBool=value=>value===true||String(value??'').toLowerCase()==='true';

export const COMPANY_FLOW_STAGES=Object.freeze([
  Object.freeze({id:'brief',name:'게임 한줄 정의',purpose:'아트북 확정 전 게임의 장르·플랫폼·핵심 정체성을 한 문장으로 고정',outputs:freezeList(['one-line-concept'])}),
  Object.freeze({id:'core-fun',name:'핵심 재미',purpose:'아트북 확정 전 플레이어가 반복해서 느껴야 할 핵심 재미 2~3개를 확정',outputs:freezeList(['core-fun-pillars'])}),
  Object.freeze({id:'world-story',name:'세계관/스토리 초안',purpose:'왜 싸우고 움직이는지, 주요 목표와 사건을 게임플레이에 필요한 수준으로 설계',outputs:freezeList(['world-premise','story-spine','character-roles'])}),
  Object.freeze({id:'storyboard',name:'콘티',purpose:'오프닝·첫 전투·보스·지역전환·대표장면을 씬/컷 단위로 정리',outputs:freezeList(['scene-board','required-assets','required-events'])}),
  Object.freeze({id:'systems',name:'시스템 설계',purpose:'전투·성장·장비·AI·보상·저장·UI 등 필요한 시스템과 연결 관계 확정',outputs:freezeList(['system-map','data-draft','interaction-map'])}),
  Object.freeze({id:'technical-architecture',name:'기술 구조',purpose:'아트북 컨셉을 엔진·플랫폼·렌더링·저장·빌드·저장소 구조와 기술 제약으로 번역',outputs:freezeList(['technical-stack','risk-list','performance-budget'])}),
  Object.freeze({id:'technical-spike',name:'기술 스파이크',purpose:'위험한 기술 요소만 작은 Web 실험으로 검증하고 모바일 성능/구현가능성을 확인',outputs:freezeList(['spike-results','web-runtime-check','risk-verdict'])}),
  Object.freeze({id:'playable-draft',name:'Web 개발판 B',purpose:'안정판 A를 보존한 채 핵심루프와 안전2+실험1을 개발판 B에서 구현',outputs:freezeList(['web-candidate-b','play-notes','known-limitations','vibe2-evidence'])}),
  Object.freeze({id:'internal-review',name:'내부 평가',purpose:'기획·개발·QA·그래픽·밸런스 관점에서 A/B와 증거를 독립 평가 후 총괄 종합',outputs:freezeList(['department-reviews','ab-evidence','director-verdict'])}),
  // 호환성을 위해 id는 owner-approval을 유지하지만 실질 권한은 JAY/AI_CEO 게임개발 게이트다.
  Object.freeze({id:'owner-approval',name:'JAY 게임개발 게이트',purpose:'게임개발 MAJOR를 포함해 ADVANCE/REVISE/REDESIGN/HOLD/KILL을 증거 기반으로 판정. CEO 예약사항만 상향',outputs:freezeList(['jay-decision','owner-escalation-if-required'])}),
  Object.freeze({id:'full-development',name:'본개발',purpose:'검증된 아트북과 JAY 판정을 기준으로 실제 콘텐츠와 시스템 구현',outputs:freezeList(['gameplay-systems','content'])}),
  Object.freeze({id:'system-complete',name:'시스템 완성',purpose:'핵심 플레이·성장·콘텐츠 흐름과 저장 구조 안정화',outputs:freezeList(['feature-complete-build'])}),
  Object.freeze({id:'graphics-upgrade',name:'그래픽·모션 고도화',purpose:'원본 KEEP/ENHANCE/COMBINE/REPLACE, 무료에셋 장부, Jaewoon Motion Engine, VFX/UI/사운드 고도화',outputs:freezeList(['production-art','motion-engine','animation','vfx','audio','asset-license-ledger'])}),
  Object.freeze({id:'integrated-qa',name:'통합 QA',purpose:'기능·회귀·밸런스·화면·스토리·그래픽·모션·라이선스와 아트북 일치 검증',outputs:freezeList(['qa-report','fix-list'])}),
  Object.freeze({id:'optimization',name:'모바일 최적화',purpose:'FPS·메모리·발열·로딩·용량·텍스처·VFX·Motion Engine 비용 점검',outputs:freezeList(['performance-report','optimized-build'])}),
  Object.freeze({id:'release-candidate',name:'출시 후보',purpose:'최종 공개 전 검증판과 증거 묶음을 고정',outputs:freezeList(['release-candidate','release-evidence'])}),
  Object.freeze({id:'public-release',name:'최종 공개',purpose:'CEO/L5 최종 공개 게이트 통과 후 공개 안정판으로 승격',outputs:freezeList(['public-release'])})
]);

export const COMPANY_REVIEW_ROLES=freezeList(['planning','development','qa','graphics','balance']);
export const COMPANY_DECISIONS=freezeList(['PASS','REVISE','DROP']);
export const ARTBOOK_LOCKED_PREDESIGN_STAGES=freezeList(['brief','core-fun','world-story','storyboard','systems']);
export const ARTBOOK_LOCKED_CONCEPT_CATEGORIES=freezeList([
  'genre','core-loop','story-direction','combat-model','progression-model','platform',
  'art-direction','character-identity','world-structure','locked-artbook-change','artbook-concept-change'
]);

// 기존 게임 프로젝트 안에서 큰 방향 변경도 JAY가 REDESIGN/KILL 포함 운영판정을 맡는다.
export const DIRECTOR_MAJOR_CATEGORIES=freezeList([
  'genre','core-loop','story-direction','combat-model','progression-model','platform',
  'art-direction','character-identity','world-structure','locked-artbook-change','artbook-concept-change',
  'major-gameplay-update','major-content-restructure','unity-investment-decision'
]);

// CEO/L5에 반드시 올리는 상위 예약사항만 둔다.
export const OWNER_DECISION_CATEGORIES=freezeList([
  'final-public-release',
  'project-delete',
  'project-closure',
  'destructive-project-action',
  'irreversible-change',
  'security-change',
  'credential-change',
  'permission-change',
  'material-new-spending',
  'paid-ai-use',
  'estop-control',
  'save-breaking-destructive-change'
]);

// 이전 이름 호환: MAJOR 자체가 CEO 승인이라는 뜻이 아니라 CEO 예약범위 목록으로만 유지한다.
export const MAJOR_PROPOSAL_CATEGORIES=OWNER_DECISION_CATEGORIES;

export function createArtbookDevelopmentLock({status='',cutCount=0,postprocessComplete=false,ref=''}={}){
  const normalizedStatus=clean(status).toUpperCase();
  const normalizedCutCount=Math.max(0,Math.floor(Number(cutCount)||0));
  const postprocess=asBool(postprocessComplete);
  const locked=normalizedStatus==='COMPLETED'&&normalizedCutCount===10&&postprocess;
  return Object.freeze({
    locked,
    status:normalizedStatus||'UNKNOWN',
    cutCount:normalizedCutCount,
    postprocessComplete:postprocess,
    sourceOfTruth:locked?'completed-artbook':'pre-artbook-design',
    ref:clean(ref),
    startStage:locked?'technical-architecture':'brief',
    lockedPreDesignStages:ARTBOOK_LOCKED_PREDESIGN_STAGES,
    lockedConceptCategories:ARTBOOK_LOCKED_CONCEPT_CATEGORIES,
    implementationRule:locked?'vibe2-implementation-with-formal-redesign-record':'pre-artbook-design-allowed',
    changeRule:locked?'JAY_REDESIGN_RECORD_REQUIRED':'normal-proposal-flow'
  });
}

export function createCompanyFlow({
  gameId='',maxRevisionRounds=2,
  artbookStatus='',artbookCutCount=0,artbookPostprocessComplete=false,artbookRef=''
}={}){
  const rounds=Math.max(0,Math.min(5,Math.floor(Number(maxRevisionRounds)||0)));
  const artbookPolicy=createArtbookDevelopmentLock({status:artbookStatus,cutCount:artbookCutCount,postprocessComplete:artbookPostprocessComplete,ref:artbookRef});
  return Object.freeze({
    version:4,
    gameId:clean(gameId),
    stages:COMPANY_FLOW_STAGES,
    currentStage:artbookPolicy.startStage,
    artbookPolicy,
    maxRevisionRounds:rounds,
    revisionRoundsUsed:0,
    proposalPolicy:Object.freeze({
      bidirectional:true,
      proposalIsNotExecution:true,
      gameMajorDelegatedToDirector:true,
      coreDecisionRequiresOwnerApproval:false,
      finalPublicReleaseRequiresOwnerApproval:true,
      destructiveSecurityCostRequiresOwnerApproval:true,
      operationalDecisionDelegatedToDirector:true,
      completedArtbookConceptMayBeRedesignedByDirector:true,
      redesignEvidenceRequired:true
    }),
    vibe2Policy:Object.freeze({
      role:'company-common-web-experiment-engine',
      stableAProtected:true,
      candidateBRequired:true,
      mayCommitIsNotAdvance:true,
      experimentBundle:Object.freeze({safe:2,risky:1}),
      gameProfileRequired:true
    }),
    graphicsPolicy:Object.freeze({
      assetStrategies:freezeList(['KEEP','ENHANCE','COMBINE','REPLACE']),
      freeAssetLicenseLedgerRequired:true,
      motionEngine:'Jaewoon Motion Engine',
      motionEnginePresentationOnly:true,
      mobileOptimized:true,
      abVerificationRequired:true,
      followGameIdentity:true
    }),
    authority:Object.freeze({
      owner:'final-public-release-destructive-security-permission-material-spending-estop-only',
      director:'game-development-major-coordination-redesign-kill-technical-implementation-and-unity-investment',
      departments:'specialist-proposals-review-and-execution-within-owned-scope'
    })
  });
}

export function createCompanyProposal({
  sourceRole='',targetRole='director',direction='bottom-up',category='implementation',summary='',reason='',evidence=[],impact='medium',estimatedCost='unknown',artbookLocked=false
}={}){
  const normalizedCategory=clean(category).toLowerCase()||'implementation';
  const normalizedDirection=direction==='top-down'?'top-down':'bottom-up';
  const locked=asBool(artbookLocked);
  const lockedConceptChange=locked&&ARTBOOK_LOCKED_CONCEPT_CATEGORIES.includes(normalizedCategory);
  const directorMajor=DIRECTOR_MAJOR_CATEGORIES.includes(normalizedCategory)||lockedConceptChange;
  const ownerDecisionRequired=OWNER_DECISION_CATEGORIES.includes(normalizedCategory);
  return Object.freeze({
    version:4,
    sourceRole:clean(sourceRole)||'department',
    targetRole:clean(targetRole)||'director',
    direction:normalizedDirection,
    category:normalizedCategory,
    summary:clean(summary),
    reason:clean(reason),
    evidence:freezeList(evidence.map(clean).filter(Boolean)),
    impact:clean(impact)||'medium',
    estimatedCost:clean(estimatedCost)||'unknown',
    artbookLocked:locked,
    lockedConceptChange,
    directorMajor,
    changeRequestRequired:lockedConceptChange,
    changeRequestType:lockedConceptChange?'JAY_REDESIGN_RECORD':null,
    requiresOwnerApproval:ownerDecisionRequired,
    delegatedToDirector:!ownerDecisionRequired,
    executable:false,
    rule:ownerDecisionRequired?'owner-reserved-gate':lockedConceptChange?'director-redesign-evidence-required':'proposal-must-be-reviewed-before-execution'
  });
}

export function createDepartmentReview({role='',decision='REVISE',findings=[],blockingIssues=[],recommendations=[]}={}){
  const normalizedRole=clean(role).toLowerCase();
  if(!COMPANY_REVIEW_ROLES.includes(normalizedRole))throw new Error(`unsupported review role: ${normalizedRole}`);
  const normalizedDecision=clean(decision).toUpperCase();
  if(!COMPANY_DECISIONS.includes(normalizedDecision))throw new Error(`unsupported review decision: ${normalizedDecision}`);
  return Object.freeze({
    role:normalizedRole,
    decision:normalizedDecision,
    findings:freezeList(findings.map(clean).filter(Boolean)),
    blockingIssues:freezeList(blockingIssues.map(clean).filter(Boolean)),
    recommendations:freezeList(recommendations.map(clean).filter(Boolean))
  });
}

export function summarizeInternalReview({reviews=[],revisionRoundsUsed=0,maxRevisionRounds=2}={}){
  const normalized=reviews.map(r=>createDepartmentReview(r));
  const missing=COMPANY_REVIEW_ROLES.filter(role=>!normalized.some(r=>r.role===role));
  if(missing.length)return Object.freeze({ready:false,decision:'REVISE',missingRoles:freezeList(missing),reviews:freezeList(normalized),reason:'all-review-roles-required'});

  const blockers=normalized.flatMap(r=>r.blockingIssues);
  const hasDrop=normalized.some(r=>r.decision==='DROP');
  const hasRevise=normalized.some(r=>r.decision==='REVISE')||blockers.length>0;
  const used=Math.max(0,Math.floor(Number(revisionRoundsUsed)||0));
  const limit=Math.max(0,Math.floor(Number(maxRevisionRounds)||0));
  let decision='PASS';
  let reason='all-required-reviews-pass';

  if(hasDrop){decision='DROP';reason='department-drop-verdict';}
  else if(hasRevise&&used<limit){decision='REVISE';reason='revision-required';}
  else if(hasRevise){decision='DROP';reason='revision-limit-reached';}

  return Object.freeze({ready:true,decision,reason,blockingIssues:freezeList(blockers),reviews:freezeList(normalized),revisionRoundsUsed:used,maxRevisionRounds:limit});
}

// 기존 함수명은 호환성을 위해 유지. 이제 기본 게이트는 JAY/Director이며 ownerRequired일 때만 CEO/L5가 필요하다.
export function createOwnerDevelopmentGate({internalReview,directorDecision='PASS',ownerDecision='PENDING',ownerRequired=false,notes=''}={}){
  const review=internalReview||{};
  const director=clean(directorDecision).toUpperCase()||'PENDING';
  const validDirector=['PENDING','PASS','REVISE','DROP'].includes(director)?director:'PENDING';
  const owner=clean(ownerDecision).toUpperCase()||'PENDING';
  const validOwner=['PENDING','PASS','REVISE','DROP'].includes(owner)?owner:'PENDING';
  const reviewPass=review.ready===true&&review.decision==='PASS';
  const directorPass=validDirector==='PASS';
  const reserved=asBool(ownerRequired);
  const ownerPass=!reserved||validOwner==='PASS';
  const approved=reviewPass&&directorPass&&ownerPass;
  return Object.freeze({
    version:4,
    internalDecision:review.decision||'REVISE',
    directorDecision:validDirector,
    ownerRequired:reserved,
    ownerDecision:validOwner,
    notes:clean(notes),
    approvedForFullDevelopment:approved,
    next:approved?'full-development':validDirector==='DROP'||review.decision==='DROP'||(reserved&&validOwner==='DROP')?'drop':'revise-or-await-gate',
    rule:reserved?'internal-pass-director-pass-and-owner-reserved-pass':'internal-pass-and-jay-director-pass'
  });
}

export function classifyCompanyProposalApproval(proposal={}){
  const p=createCompanyProposal(proposal);
  return Object.freeze({
    requiresOwnerApproval:p.requiresOwnerApproval,
    approver:p.requiresOwnerApproval?'owner':'director',
    mayAutoExecute:!p.requiresOwnerApproval&&!p.changeRequestRequired,
    changeRequestRequired:p.changeRequestRequired,
    changeRequestType:p.changeRequestType,
    directorMajor:p.directorMajor,
    reason:p.requiresOwnerApproval?'owner-reserved-category':p.changeRequestRequired?'jay-redesign-record-required':p.directorMajor?'game-major-delegated-to-jay':'delegated-operational-or-technical-decision'
  });
}
