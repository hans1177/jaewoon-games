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

export const MOTION_CRAFT_KNOBS=Object.freeze({
 attackStrike:Object.freeze([.65,1.35]),secondaryMotion:Object.freeze([.3,1.3]),
 footContact:Object.freeze([.7,1.3]),headLead:Object.freeze([.6,1.35]),
 recovery:Object.freeze([.7,1.3]),poseSmoothing:Object.freeze([.65,1.35]),
 limbArc:Object.freeze([.65,1.3]),bossWeight:Object.freeze([.7,1.3]),
 npcGesture:Object.freeze([.5,1.4]),tailFollow:Object.freeze([.5,1.4]),
 hitRecoil:Object.freeze([.65,1.35]),mobileDetail:Object.freeze([.5,1.15])
});
const FEATURE_KNOBS=Object.freeze({
 NATIVE_RIG_BINDING:['poseSmoothing'],
 POSE_VELOCITY_CROSSFADE:['poseSmoothing','recovery'],
 BODY_PLAN_LOCOMOTION:['limbArc','headLead'],
 CINEMATIC_ATTACK_ENVELOPE:['attackStrike','recovery'],
 APPROVED_COMBO_CONTINUITY:['recovery','poseSmoothing'],
 FULL_BODY_WEIGHT_TRANSFER:['limbArc','headLead'],
 GROUNDED_FOOT_IK_HANDOFF:['footContact','poseSmoothing'],
 NPC_GAZE_AND_GESTURE:['npcGesture','headLead'],
 CREATURE_SPECIES_ACTING:['tailFollow','limbArc'],
 BOSS_SIGNATURE_STAGING:['bossWeight','attackStrike'],
 DIRECTIONAL_HIT_REACTION:['hitRecoil','recovery'],
 WEAPON_ACTION_STYLE:['attackStrike','limbArc'],
 COMPATIBLE_RIG_RETARGET:['poseSmoothing'],
 MOTION_EVOLUTION_PARAMETERS:['recovery','headLead'],
 MOBILE_LOD_AND_SECONDARY_MOTION:['mobileDetail','secondaryMotion']
});
const normProfile=profile=>{
 const valid=profile&&typeof profile==='object'&&!Array.isArray(profile)?profile:{};
 return Object.freeze(Object.fromEntries(Object.entries(MOTION_CRAFT_KNOBS).map(([key,[low,high]])=>{
  const value=valid[key];return[key,typeof value==='number'&&Number.isFinite(value)?Math.max(low,Math.min(high,value)):1];
 })));
};
export function validateMotionCraftProfile(profile={}){
 if(!profile||typeof profile!=='object'||Array.isArray(profile))return false;
 const keys=Object.keys(profile);
 if(!keys.length||keys.some(k=>!Object.hasOwn(MOTION_CRAFT_KNOBS,k)))return false;
 return keys.every(k=>typeof profile[k]==='number'&&Number.isFinite(profile[k])
  &&profile[k]>=MOTION_CRAFT_KNOBS[k][0]&&profile[k]<=MOTION_CRAFT_KNOBS[k][1]);
}
// Native replay proof is required before learning any parameter; a source compile
// or repeated build count alone cannot give a profile positive weight.
export function createVerifiedActorMotionVariants({
 gameId='',actorClass='',featureId='',history=[],bodyPlan='BIPED',generation=1,
}={}){
 if(!ACTOR_CLASSES.includes(actorClass)||!MOTION_FORGE_FEATURES.includes(featureId))
  return Object.freeze({status:'NOT_APPLICABLE',variants:Object.freeze([])});
 const proofs=history.filter(validRow).filter(row=>row.gameId===gameId&&row.actorClass===actorClass
  &&row.featureId===featureId&&row.bodyPlan!==undefined&&row.bodyPlan===bodyPlan
  &&validateMotionCraftProfile(row.profile));
 const best=[...proofs].sort((a,b)=>b.afterScore-a.afterScore||a.evidenceId.localeCompare(b.evidenceId))[0];
 const base=normProfile(best?.profile||{});
 const knobs=FEATURE_KNOBS[featureId]||[];
 const cursor=Math.max(0,Math.floor(Number(generation)||1)-1);
 const knob=knobs[cursor%Math.max(1,knobs.length)];
 if(!knob)return Object.freeze({status:'NO_SAFE_MOTION_KNOB',variants:Object.freeze([])});
 const refinement=Number((.16/(1+Math.sqrt(proofs.length))).toFixed(4));
 const limit=MOTION_CRAFT_KNOBS[knob];
 const adjusted=sign=>{
  const value=Number((base[knob]+refinement*sign).toFixed(4));
  return Object.freeze({...base,[knob]:Math.max(limit[0],Math.min(limit[1],value))});
 };
 return Object.freeze({
  status:best?'VERIFIED_BASELINE_REFINEMENT':'SOURCE_GROUNDED_EXPERIMENT',
  gameId,actorClass,featureId,bodyPlan,generation:cursor+1,
  verifiedSamples:proofs.length,baselineSourceEvidenceId:best?.evidenceId||null,
  sourceRevision:best?.candidateRevision||null,selectedKnob:knob,
  step:refinement,requiresSameActorNativeRuntime:true,
  noProductionPromotionWithoutQA:true,noGameplayAuthority:true,
  variants:Object.freeze([
   Object.freeze({id:'A',profile:base,verified:best!==undefined,sourceEvidenceId:best?.evidenceId||null}),
   Object.freeze({id:'B',profile:adjusted(1),verified:false}),
   Object.freeze({id:'C',profile:adjusted(-1),verified:false}),
  ])
 });
}

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
    ||(x.profile!==undefined&&!validateMotionCraftProfile(x.profile))
    ||(x.bodyPlan!==undefined&&(!safeId(x.bodyPlan)||!/^(BIPED|QUADRUPED|GIANT|FLYER|CRAWLER|SERPENT|PROP)$/.test(x.bodyPlan)))
    ||!safeNumber(x.beforeScore)||!safeNumber(x.afterScore)||x.afterScore-x.beforeScore<3
    ||x.regressionCount!==0)return false;
 if(!safeId(x.evidenceId)||!safeId(x.platform)||!['ROBLOX','WEB'].includes(x.platform)
    ||!(/^[a-zA-Z0-9_.\/-]{1,200}$/.test(clean(x.sourceOwnerFile))&&!clean(x.sourceOwnerFile).split('/').includes('..'))||!safeId(x.nativeReplayId))return false;
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
 const fallbackActor=actors[cycle%actors.length];
 const fallbackFeature=MOTION_FORGE_FEATURES[Math.floor(cycle/actors.length)%MOTION_FORGE_FEATURES.length];
 const selected=candidates.find(row=>row.actor===fallbackActor&&row.feature===fallbackFeature)
  ||candidates.find(row=>row.actor===fallbackActor)
  ||candidates[cycle%candidates.length];
 const file=selected.actor.files[cycle%selected.actor.files.length];
 // An NPC/creature name does not establish skeletal topology. Unknown rigs
 // must be inspected before BIPED, QUADRUPED or other authored profiles are applied.
 const supportedBodyPlans=new Set(['BIPED','QUADRUPED','GIANT','FLYER','CRAWLER','SERPENT','PROP']);
 const bodyPlan=supportedBodyPlans.has(selected.actor.bodyPlan)?selected.actor.bodyPlan:null;
 const variants=bodyPlan?createVerifiedActorMotionVariants({
  gameId,actorClass:selected.actor.actorClass,featureId:selected.feature,history,
  bodyPlan,generation
 }):Object.freeze({
  status:'ACTUAL_RIG_BODY_PLAN_CONFIRMATION_REQUIRED',
  variants:Object.freeze([]),gameId,actorClass:selected.actor.actorClass,
  featureId:selected.feature,requiresSameActorNativeRuntime:true,
  noProductionPromotionWithoutQA:true,noGameplayAuthority:true
 });
 return Object.freeze({
  generation:cycle+1,actorClass:selected.actor.actorClass,sourceOwnerFile:file,
  qualityAxis:selected.feature,featureId:selected.feature,
  evidenceCount:selected.rows,previousVerifiedScore:selected.last?.afterScore??null,
  bodyPlan:bodyPlan||'UNCONFIRMED',bodyPlanVerifiedFromSource:bodyPlan!==null,
  nativeAuthoringApi:'RobloxCommonMotion.CreateProceduralActorSequence',
  proceduralPoseApi:'RobloxCommonMotion.SampleProceduralActorMotion',
  sourceVerifiedMotionVariantPlan:variants,
  verifiedTransferGames:selected.last?null:(transferable.has(selected.feature)?3:0),
  decision:selected.rows?'VERIFIED_WEAK_AXIS_REVISIT':'SOURCE_GROUNDED_UNVERIFIED_EXPLORATION',
  intent:'REAL_NATIVE_ACTOR_ANIMATION_IMPLEMENTATION',
  noUnknownBoneCreation:true,approvedExistingRigAndClipRequired:true,
  preserveGameplayAndSave:true,sourceOnlyEvidence:true,runtimeVerified:false
 });
}
