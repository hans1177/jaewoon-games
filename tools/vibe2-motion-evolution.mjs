// 게임별 모션 진화: 기존 Vibe2 빌드업의 선택 데이터만 제공한다.
// 모델·독립 큐·자동 배포·게임플레이 권한을 갖지 않는다.
import fs from 'node:fs';
import path from 'node:path';
export const MOTION_FORGE_FEATURES=Object.freeze([
 'NATIVE_RIG_BINDING','POSE_VELOCITY_CROSSFADE','BODY_PLAN_LOCOMOTION',
 'CINEMATIC_ATTACK_ENVELOPE','APPROVED_COMBO_CONTINUITY','FULL_BODY_WEIGHT_TRANSFER',
 'GROUNDED_FOOT_IK_HANDOFF','NPC_GAZE_AND_GESTURE','CREATURE_SPECIES_ACTING',
 'BOSS_SIGNATURE_STAGING','DIRECTIONAL_HIT_REACTION','WEAPON_ACTION_STYLE',
 'COMPATIBLE_RIG_RETARGET','MOTION_EVOLUTION_PARAMETERS','MOBILE_LOD_AND_SECONDARY_MOTION'
]);
const ACTOR_CLASSES=Object.freeze(['PLAYER','NPC','ENEMY','BOSS','CREATURE','COMPANION','MOUNT','INTERACTIVE_PROP']);
const SHA=/^[0-9a-f]{40}$/i;
const safeNumber=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=100;
const safeId=x=>typeof x==='string'&&/^[a-zA-Z0-9_-]{1,80}$/.test(x);
const clean=x=>String(x??'').trim();
function validRow(x){
 if(!x||typeof x!=='object'||!safeId(x.gameId)||!ACTOR_CLASSES.includes(x.actorClass)
    ||!MOTION_FORGE_FEATURES.includes(x.featureId)||!SHA.test(clean(x.sourceRevision))
    ||!SHA.test(clean(x.candidateRevision))||x.sourceRevision===x.candidateRevision)return false;
 if(x.actualPlatformRuntime!==true||x.actualActorObserved!==true||x.nativePlaybackObserved!==true
    ||x.independentQaPassed!==true||x.gameplayAuthorityPreserved!==true
    ||x.sameActor!==true||x.sameScene!==true||x.sameDevice!==true
    ||x.sameInput!==true||x.sameFrameLimit!==true
    ||!safeNumber(x.beforeScore)||!safeNumber(x.afterScore)||x.afterScore-x.beforeScore<3
    ||x.regressionCount!==0)return false;
 if(!safeId(x.evidenceId)||!safeId(x.platform)||!['ROBLOX','WEB'].includes(x.platform)
    ||!safeId(x.sourceOwnerFile?.replace?.All?.('/','_')||'')||!safeId(x.nativeReplayId))return false;
 return true;
}
export function validateMotionEvolutionEvidence(evidence={}){
 const pass=validRow(evidence);
 return Object.freeze({pass,status:pass?'VERIFIED_RESULT_REUSABLE':'UNVERIFIED_RESULT_REJECTED',
  noRuntimePassFromSourceInspection:true,gameplayAuthority:false});
}
export function loadVerifiedMotionHistory(repoRoot=process.cwd()){
 const root=path.resolve(repoRoot),relative='company-learning/motion-evolution-history.json';
 const filename=path.resolve(root,relative);
 try{
  const real=fs.realpathSync(filename);
  if(real!==filename||!real.startsWith(root+path.sep)||fs.statSync(real).size>1024*1024)
   return Object.freeze([]);
  const data=JSON.parse(fs.readFileSync(real,'utf8'));
  return Object.freeze((Array.isArray(data?.records)?data.records:[]).filter(validRow).slice(-800)
   .map(row=>Object.freeze({...row})));
 }catch{return Object.freeze([]);}
}
export function recordVerifiedMotionEvolution(previous=[],event={}){
 // 이 함수는 증거를 꾸미거나 파일을 쓰지 않는다. 기존 검증된 결과를 기록 가능한 형태로만 반환한다.
 if(!validRow(event))return Object.freeze({accepted:false,records:Object.freeze([...previous].filter(validRow))});
 const rows=[...previous.filter(validRow)].filter(row=>row.evidenceId!==event.evidenceId);
 rows.push(Object.freeze({...event}));
 return Object.freeze({accepted:true,records:Object.freeze(rows.slice(-800))});
}
export function planVerifiedActorEvolution({
 gameId='',generation=1,platform='ROBLOX',actorCandidates=[],history=[],
}={}){
 const actors=actorCandidates.filter(row=>ACTOR_CLASSES.includes(row.actorClass)
   &&Array.isArray(row.files)&&row.files.some(file=>typeof file==='string'&&file.length>0));
 if(!actors.length)return Object.freeze({generation:Math.max(1,Math.floor(Number(generation)||1)),
  actorClass:null,sourceOwnerFile:null,qualityAxis:null,featureId:null,
  evidenceCount:0,decision:'NO_SOURCE_BACKED_ACTOR',runtimeVerified:false});
 const cycle=Math.max(0,Math.floor(Number(generation)||1)-1);
 const accepted=history.filter(validRow).filter(row=>row.gameId===gameId&&row.platform===platform);
 // 서로 다른 게임 3개가 검증한 같은 특징만 범용 지식으로 활용한다.
 const transferable=new Map();
 for(const feature of MOTION_FORGE_FEATURES){
  const proofs=history.filter(validRow).filter(row=>row.featureId===feature&&row.platform===platform);
  const games=new Set(proofs.map(row=>row.gameId));
  if(games.size>=3)transferable.set(feature,proofs.reduce((n,row)=>n+row.afterScore-row.beforeScore,0)/proofs.length);
 }
 const entries=[];
 for(const actor of actors)for(let i=0;i<MOTION_FORGE_FEATURES.length;i++){
  const feature=MOTION_FORGE_FEATURES[i];
  const rows=accepted.filter(row=>row.actorClass===actor.actorClass&&row.featureId===feature);
  const last=rows[rows.length-1];
  // 이전 점수는 실제 플랫폼 검증 후에만 인정한다. 검증 기록이 없으면 대상을 순환한다.
  const score=last?last.afterScore:50;
  const debt=100-score;
  const repeatPenalty=rows.length*3;
  const transferBonus=(transferable.get(feature)||0)*.12;
  const ordinal=actors.findIndex(row=>row.actorClass===actor.actorClass)*MOTION_FORGE_FEATURES.length+i;
  const exploration=rows.length===0?2:0;
  entries.push({actor,feature,index:i,score,rows:rows.length,
    rank:debt-repeatPenalty+transferBonus+exploration,ordinal,last});
 }
 const maxRank=Math.max(...entries.map(row=>row.rank));
 const candidates=entries.filter(row=>row.rank===maxRank);
 const selected=candidates[cycle%candidates.length];
 const file=selected.actor.files[cycle%selected.actor.files.length];
 return Object.freeze({
  generation:cycle+1,actorClass:selected.actor.actorClass,sourceOwnerFile:file,
  qualityAxis:selected.feature,featureId:selected.feature,
  evidenceCount:selected.rows,previousVerifiedScore:selected.last?.afterScore??null,
  verifiedTransferGames:selected.last?null:(transferable.has(selected.feature)?3:0),
  decision:selected.rows?'VERIFIED_WEAK_AXIS_REVISIT':'SOURCE_GROUNDED_UNVERIFIED_EXPLORATION',
  intent:'REAL_NATIVE_ACTOR_ANIMATION_IMPLEMENTATION',
  noUnknownBoneCreation:true,approvedExistingRigAndClipRequired:true,
  preserveGameplayAndSave:true,sourceOnlyEvidence:true,runtimeVerified:false
 });
}
