// 신규게임 candidate가 독립 QA를 통과해 autonomous-dev에 반영된 뒤 메타데이터만 완료 처리한다.
// 공개 main 게임코드/출시승인 권한은 절대 다루지 않는다.

const clean=value=>String(value??'').trim();

export function applyVerifiedPrototypePromotion({state,portfolio,evidence,devRevision=null,timestamp=new Date().toISOString()}={}){
  if(!state||typeof state!=='object'||!portfolio||typeof portfolio!=='object')throw new Error('incubator state/portfolio 필요');
  if(!evidence||typeof evidence!=='object')throw new Error('promotion evidence 필요');
  if(evidence.newProject!==true)return{changed:false,reason:'NOT_NEW_PROJECT'};
  const incubatorId=clean(evidence.incubatorCandidateId);
  const gameId=clean(evidence.gameId);
  const candidateId=clean(evidence.candidateId);
  if(!incubatorId||!/^P\d{4,}$/.test(gameId)||!candidateId)throw new Error('신규 prototype evidence 식별자 불완전');
  if(evidence.paidApi!==false||evidence.selfPromote!==false||evidence.publicStableModified!==false)throw new Error('안전하지 않은 prototype evidence');

  const candidate=(state.candidates||[]).find(c=>c.id===incubatorId&&c.reservedProjectId===gameId);
  if(!candidate)throw new Error(`incubator candidate not found: ${incubatorId}`);
  const project=(portfolio.projects||[]).find(p=>p.id===gameId&&p.incubatorCandidateId===incubatorId);
  if(!project)throw new Error(`portfolio project not found: ${gameId}`);

  if(candidate.prototypeDevComplete===true&&candidate.status==='PROTOTYPE_DEV_VERIFIED'){
    if(candidate.verifiedCandidateId!==candidateId)throw new Error('이미 다른 candidate로 prototype 검증 완료');
    return{changed:false,reason:'ALREADY_VERIFIED',candidate,project};
  }
  if(candidate.status!=='PROTOTYPE_REGISTERED')throw new Error(`prototype 완료 전환 상태 오류: ${candidate.status}`);
  if(project.publicReleaseApproved===true||candidate.publicReleaseApproved===true)throw new Error('incubator 자동검증에서 공개승인 금지');

  candidate.prototypeDevComplete=true;
  candidate.status='PROTOTYPE_DEV_VERIFIED';
  candidate.finalVerdict='PROTOTYPE_DEV_VERIFIED';
  candidate.verifiedCandidateId=candidateId;
  candidate.verifiedSourceRevision=evidence.sourceCommit??null;
  candidate.verifiedDevRevision=devRevision??null;
  candidate.verifiedAt=timestamp;
  candidate.publicReleaseApproved=false;

  project.profileStatus='PROTOTYPE_DEV_VERIFIED';
  project.mode='EXPERIMENT_ONLY';
  project.prototypeVerifiedAt=timestamp;
  project.prototypeVerifiedCandidateId=candidateId;
  project.prototypeVerifiedDevRevision=devRevision??null;
  project.publicReleaseApproved=false;

  return{changed:true,reason:'PROTOTYPE_DEV_VERIFIED',candidate,project};
}
