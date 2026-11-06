// 파일명: assets/artbook-lifecycle.js
// 역할: 아트북을 일회성 결과물이 아니라 버전형 살아있는 설계/기획 기준 문서로 관리한다.
// 원칙: 기존 승인 버전은 보존하고, 새 수정안이 승인될 때만 latest baseline을 이동한다.

const clean=value=>String(value??'').trim();
const freeze=value=>Object.freeze(value);
const freezeList=value=>freeze(Array.isArray(value)?[...value]:[]);

export const ARTBOOK_VERSION_STATES=freezeList([
  'DRAFT',
  'REVISION_CANDIDATE',
  'DESIGN_BASELINE',
  'DEVELOPMENT_BASELINE',
  'RELEASE_BASELINE',
  'SUPERSEDED'
]);

export const ARTBOOK_MILESTONE_KINDS=freeze({
  V0:'VIBE2_FIRST_DRAFT',
  V1:'AI_INTEGRATED_DESIGN_BASELINE',
  V2:'DEVELOPMENT_CONFIRMED_UPGRADE',
  V3:'RELEASE_CONFIRMED_UPGRADE'
});

export const ARTBOOK_REVISION_TRIGGERS=freezeList([
  'OWNER_DIRECTIVE',
  'DEVELOPMENT_CONFIRMED',
  'RELEASE_CONFIRMED',
  'PLAYTEST_EVIDENCE',
  'QA_DESIGN_FINDING',
  'BALANCE_FINDING',
  'STORY_OR_QUEST_CAUSALITY_GAP',
  'ART_OR_UX_DIRECTION_CHANGE',
  'TECHNICAL_CONSTRAINT',
  'IMPLEMENTATION_DRIFT',
  'CONTENT_CHANGE',
  'POST_RELEASE_UPDATE'
]);

const VALID_BASELINES=new Set(['DESIGN_BASELINE','DEVELOPMENT_BASELINE','RELEASE_BASELINE']);
const VALID_STATES=new Set(ARTBOOK_VERSION_STATES);
const VALID_TRIGGERS=new Set(ARTBOOK_REVISION_TRIGGERS);

export function normalizeArtbookVersion(version={}){
  const state=clean(version.state).toUpperCase()||'DRAFT';
  if(!VALID_STATES.has(state))throw new Error(`unsupported artbook state: ${state}`);
  return freeze({
    id:clean(version.id),
    version:Number(version.version)||0,
    label:clean(version.label),
    state,
    milestone:clean(version.milestone),
    sourceVersionId:clean(version.sourceVersionId)||null,
    trigger:clean(version.trigger).toUpperCase()||null,
    reason:clean(version.reason),
    evidence:freezeList((version.evidence||[]).map(clean).filter(Boolean)),
    createdAt:clean(version.createdAt),
    approvedAt:clean(version.approvedAt)||null,
    approved:Boolean(version.approved),
    ref:clean(version.ref)
  });
}

export function createArtbookRevisionRequest({gameId='',currentBaseline=null,trigger='OWNER_DIRECTIVE',reason='',evidence=[],requestedBy=''}={}){
  const normalizedTrigger=clean(trigger).toUpperCase();
  if(!VALID_TRIGGERS.has(normalizedTrigger))throw new Error(`unsupported artbook revision trigger: ${normalizedTrigger}`);
  const baseline=currentBaseline?normalizeArtbookVersion(currentBaseline):null;
  return freeze({
    version:1,
    type:'ARTBOOK_REVISION_REQUEST',
    gameId:clean(gameId),
    requestedBy:clean(requestedBy)||'system',
    trigger:normalizedTrigger,
    reason:clean(reason),
    evidence:freezeList((evidence||[]).map(clean).filter(Boolean)),
    currentBaselineId:baseline?.id||null,
    currentBaselineVersion:baseline?.version||0,
    currentBaselineState:baseline?.state||null,
    mayEditCurrentBaseline:false,
    createsNewVersion:true,
    implementationBaselineChangesBeforeApproval:false,
    status:'REVISION_CANDIDATE_REQUIRED'
  });
}

export function resolveRequiredArtbookUpgrade({gameStage='',currentBaselineState=''}={}){
  const stage=clean(gameStage).toLowerCase();
  const baseline=clean(currentBaselineState).toUpperCase();
  if(stage==='release-confirmed'&&baseline!=='RELEASE_BASELINE')return freeze({required:true,trigger:'RELEASE_CONFIRMED',targetState:'RELEASE_BASELINE'});
  if(stage==='development-confirmed'&&!['DEVELOPMENT_BASELINE','RELEASE_BASELINE'].includes(baseline))return freeze({required:true,trigger:'DEVELOPMENT_CONFIRMED',targetState:'DEVELOPMENT_BASELINE'});
  return freeze({required:false,trigger:null,targetState:VALID_BASELINES.has(baseline)?baseline:null});
}

export function promoteArtbookVersion({versions=[],candidateId='',targetState='DESIGN_BASELINE',approvedAt=''}={}){
  const normalized=versions.map(normalizeArtbookVersion);
  const state=clean(targetState).toUpperCase();
  if(!VALID_BASELINES.has(state))throw new Error(`target state must be baseline: ${state}`);
  const candidate=normalized.find(item=>item.id===clean(candidateId));
  if(!candidate)throw new Error(`candidate not found: ${candidateId}`);
  if(!['DRAFT','REVISION_CANDIDATE'].includes(candidate.state))throw new Error(`candidate state cannot be promoted: ${candidate.state}`);

  const next=normalized.map(item=>{
    if(item.id===candidate.id)return normalizeArtbookVersion({...item,state,approved:true,approvedAt:clean(approvedAt)||item.approvedAt});
    if(VALID_BASELINES.has(item.state))return normalizeArtbookVersion({...item,state:'SUPERSEDED'});
    return item;
  });
  const latest=next.find(item=>item.id===candidate.id);
  return freeze({
    versions:freezeList(next),
    latestBaseline:latest,
    latestBaselineId:latest.id,
    latestBaselineVersion:latest.version,
    historyPreserved:true,
    overwritePreviousVersion:false
  });
}

export function createArtbookLifecycle({gameId='',versions=[]}={}){
  const normalized=versions.map(normalizeArtbookVersion).sort((a,b)=>a.version-b.version);
  const baselines=normalized.filter(item=>VALID_BASELINES.has(item.state));
  const latestBaseline=baselines.at(-1)||null;
  return freeze({
    version:1,
    gameId:clean(gameId),
    documentType:'LIVING_GAME_DESIGN_ARTBOOK',
    versions:freezeList(normalized),
    latestBaseline,
    latestBaselineId:latestBaseline?.id||null,
    latestBaselineVersion:latestBaseline?.version||0,
    revisionAllowedAnytime:true,
    requiredUpgradeTriggers:freezeList(['DEVELOPMENT_CONFIRMED','RELEASE_CONFIRMED']),
    optionalRevisionTriggers:freezeList(ARTBOOK_REVISION_TRIGGERS.filter(x=>!['DEVELOPMENT_CONFIRMED','RELEASE_CONFIRMED'].includes(x))),
    previousVersionsImmutable:true,
    implementationUsesLatestApprovedBaseline:true
  });
}
