// 파일명: assets/vibe-company-development-flow.js
// 역할: 재운컴퍼니 게임 제작의 사전기획 → 시험 → 내부평가 → 핵심 사용자승인 → 본개발 흐름과 상/하향 제안 계약을 정의한다.
// 원칙: 핵심 방향·유료비용·세이브 파괴만 한재운 승인으로 올리고, 나머지 운영/기술/구현 판단은 총괄 AI가 결정한다.

const freezeList=value=>Object.freeze(Array.isArray(value)?[...value]:[]);
const clean=value=>String(value??'').trim();

export const COMPANY_FLOW_STAGES=Object.freeze([
  Object.freeze({id:'brief',name:'게임 한줄 정의',purpose:'게임의 장르·플랫폼·핵심 정체성을 한 문장으로 고정',outputs:freezeList(['one-line-concept'])}),
  Object.freeze({id:'core-fun',name:'핵심 재미',purpose:'플레이어가 반복해서 느껴야 할 핵심 재미 2~3개를 확정',outputs:freezeList(['core-fun-pillars'])}),
  Object.freeze({id:'world-story',name:'세계관/스토리 초안',purpose:'왜 싸우는지, 누구와 왜 움직이는지, 주요 목표를 게임플레이에 필요한 수준으로 설계',outputs:freezeList(['world-premise','story-spine','character-roles'])}),
  Object.freeze({id:'storyboard',name:'콘티',purpose:'오프닝·첫 전투·보스·지역전환·중요 연출을 씬/컷 단위로 정리',outputs:freezeList(['scene-board','required-assets','required-events'])}),
  Object.freeze({id:'systems',name:'시스템 설계',purpose:'전투·성장·장비·AI·보상·저장·UI 등 필요한 시스템과 연결 관계를 확정',outputs:freezeList(['system-map','data-draft','interaction-map'])}),
  Object.freeze({id:'technical-architecture',name:'기술 구조',purpose:'엔진·플랫폼·렌더링·저장·빌드·저장소 구조와 기술 제약을 결정',outputs:freezeList(['technical-stack','risk-list','performance-budget'])}),
  Object.freeze({id:'technical-spike',name:'기술 스파이크',purpose:'위험한 기술 요소만 짧게 시험해 실제 구현 가능성과 모바일 성능을 확인',outputs:freezeList(['spike-results','android-build-check','risk-verdict'])}),
  Object.freeze({id:'playable-draft',name:'플레이어블 초안',purpose:'임시 그래픽으로 핵심 루프와 조작감이 실제로 재미있는지 확인',outputs:freezeList(['playable-prototype','play-notes','known-limitations'])}),
  Object.freeze({id:'internal-review',name:'내부 평가',purpose:'기획·개발·QA·그래픽·밸런스 관점에서 독립 평가 후 총괄이 종합',outputs:freezeList(['department-reviews','director-verdict'])}),
  Object.freeze({id:'owner-approval',name:'핵심 결정 게이트',purpose:'본개발 전 장르·핵심 루프·스토리 큰 방향·전투 핵심·성장 핵심·플랫폼 등 핵심 방향만 한재운에게 PASS/REVISE/DROP으로 승인받음',outputs:freezeList(['owner-decision'])}),
  Object.freeze({id:'full-development',name:'본개발',purpose:'승인된 핵심 설계를 기준으로 실제 콘텐츠와 시스템을 구현',outputs:freezeList(['gameplay-systems','content'])}),
  Object.freeze({id:'system-complete',name:'시스템 완성',purpose:'핵심 플레이·성장·콘텐츠 흐름과 저장 구조를 먼저 안정화',outputs:freezeList(['feature-complete-build'])}),
  Object.freeze({id:'graphics-upgrade',name:'그래픽 고도화',purpose:'확정된 플레이 구조 위에 모델·애니메이션·텍스처·조명·VFX·UI·사운드를 고도화',outputs:freezeList(['production-art','animation','vfx','audio'])}),
  Object.freeze({id:'integrated-qa',name:'통합 QA',purpose:'기능·회귀·밸런스·화면·스토리 흐름·그래픽 연결을 검증',outputs:freezeList(['qa-report','fix-list'])}),
  Object.freeze({id:'optimization',name:'모바일 최적화',purpose:'FPS·메모리·발열·로딩·용량·LOD·텍스처와 VFX 비용을 점검',outputs:freezeList(['performance-report','optimized-build'])}),
  Object.freeze({id:'android-build',name:'Android 빌드',purpose:'APK/AAB 빌드와 실제 기기 설치·실행 검증',outputs:freezeList(['apk-or-aab','device-test-report'])})
]);

export const COMPANY_REVIEW_ROLES=freezeList(['planning','development','qa','graphics','balance']);
export const COMPANY_DECISIONS=freezeList(['PASS','REVISE','DROP']);

// 한재운에게 반드시 올리는 결정만 이 목록에 둔다.
// 카메라 세부, 엔진 내부 구성, 일반 대규모 구현, 그래픽/QA/밸런스/기술 선택은 총괄 AI 위임 사항이다.
export const OWNER_DECISION_CATEGORIES=freezeList([
  'genre',
  'core-loop',
  'story-direction',
  'combat-model',
  'progression-model',
  'platform',
  'save-breaking-change',
  'monetization',
  'paid-ai-use'
]);

// 이전 이름을 유지해 기존 호출부 호환성을 깨지 않는다.
export const MAJOR_PROPOSAL_CATEGORIES=OWNER_DECISION_CATEGORIES;

export function createCompanyFlow({gameId='',maxRevisionRounds=2}={}){
  const rounds=Math.max(0,Math.min(5,Math.floor(Number(maxRevisionRounds)||0)));
  return Object.freeze({
    version:2,
    gameId:clean(gameId),
    stages:COMPANY_FLOW_STAGES,
    currentStage:'brief',
    maxRevisionRounds:rounds,
    revisionRoundsUsed:0,
    proposalPolicy:Object.freeze({
      bidirectional:true,
      proposalIsNotExecution:true,
      coreDecisionRequiresOwnerApproval:true,
      operationalDecisionDelegatedToDirector:true
    }),
    graphicsPolicy:Object.freeze({prototype:'rough-feel-only',production:'after-system-stability',mobileOptimized:true}),
    authority:Object.freeze({
      owner:'core-direction-cost-and-save-breaking-only',
      director:'coordination-operational-technical-and-implementation-approval',
      departments:'specialist-proposals-review-and-execution'
    })
  });
}

export function createCompanyProposal({
  sourceRole='',targetRole='director',direction='bottom-up',category='implementation',summary='',reason='',evidence=[],impact='medium',estimatedCost='unknown'
}={}){
  const normalizedCategory=clean(category).toLowerCase()||'implementation';
  const normalizedDirection=direction==='top-down'?'top-down':'bottom-up';
  const ownerDecisionRequired=OWNER_DECISION_CATEGORIES.includes(normalizedCategory);
  return Object.freeze({
    version:2,
    sourceRole:clean(sourceRole)||'department',
    targetRole:clean(targetRole)||'director',
    direction:normalizedDirection,
    category:normalizedCategory,
    summary:clean(summary),
    reason:clean(reason),
    evidence:freezeList(evidence.map(clean).filter(Boolean)),
    impact:clean(impact)||'medium',
    estimatedCost:clean(estimatedCost)||'unknown',
    requiresOwnerApproval:ownerDecisionRequired,
    delegatedToDirector:!ownerDecisionRequired,
    executable:false,
    rule:'proposal-must-be-reviewed-before-execution'
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

export function createOwnerDevelopmentGate({internalReview,ownerDecision='PENDING',notes=''}={}){
  const review=internalReview||{};
  const owner=clean(ownerDecision).toUpperCase()||'PENDING';
  const validOwnerDecision=['PENDING','PASS','REVISE','DROP'].includes(owner)?owner:'PENDING';
  const canRequestOwner=review.ready===true&&['PASS','REVISE','DROP'].includes(review.decision);
  const approved=canRequestOwner&&review.decision==='PASS'&&validOwnerDecision==='PASS';
  return Object.freeze({
    version:2,
    internalDecision:review.decision||'REVISE',
    ownerDecision:validOwnerDecision,
    notes:clean(notes),
    approvedForFullDevelopment:approved,
    next:approved?'full-development':validOwnerDecision==='DROP'||review.decision==='DROP'?'drop':'revise-or-await-owner',
    rule:'initial-full-development-requires-internal-pass-and-owner-core-direction-pass'
  });
}

export function classifyCompanyProposalApproval(proposal={}){
  const p=createCompanyProposal(proposal);
  return Object.freeze({
    requiresOwnerApproval:p.requiresOwnerApproval,
    approver:p.requiresOwnerApproval?'owner':'director',
    mayAutoExecute:!p.requiresOwnerApproval,
    reason:p.requiresOwnerApproval?'owner-core-decision-required':'delegated-operational-or-technical-decision'
  });
}
