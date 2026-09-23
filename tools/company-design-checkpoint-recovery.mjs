// 파일명: tools/company-design-checkpoint-recovery.mjs
// 역할: Gemini/외부 모델 용량과 무관하게 이미 검증된 deterministic pre-gate PASS 체크포인트를
//       정식 DESIGN_ONLY 후보 파일로 물질화하여 동일한 strict deterministic gate로 이어준다.
// 원칙: AI review/verdict를 합성하지 않는다. PASS 증거가 없는 체크포인트는 복구하지 않는다.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const clean=v=>String(v??'').trim();
const readJson=(file,fallback=null)=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}};
const writeJson=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n','utf8');};
const arg=name=>{const hit=process.argv.find(v=>v.startsWith(`--${name}=`));return hit?clean(hit.slice(name.length+3)):'';};
function kstDate(){const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const get=t=>parts.find(x=>x.type===t)?.value||'';return `${get('year')}-${get('month')}-${get('day')}`;}
function deepClone(v){return v==null?v:JSON.parse(JSON.stringify(v));}
function merge(base,patch){
  if(!patch||typeof patch!=='object'||Array.isArray(patch))return deepClone(patch);
  const out=base&&typeof base==='object'&&!Array.isArray(base)?deepClone(base):{};
  for(const [key,value] of Object.entries(patch)){
    if(value&&typeof value==='object'&&!Array.isArray(value)&&out[key]&&typeof out[key]==='object'&&!Array.isArray(out[key]))out[key]=merge(out[key],value);
    else out[key]=deepClone(value);
  }
  return out;
}
function deterministicRows(checkpoint={}){
  return Object.entries(checkpoint.phases||{})
    .filter(([name,value])=>/^deterministic_pre_gate(?:_after_repair_\d+)?$/.test(name)&&value&&typeof value==='object')
    .map(([name,value],index)=>{
      const repair=Number(name.match(/_after_repair_(\d+)$/)?.[1]||0);
      const threshold=Math.max(80,Number(value.passMinimum||80));
      const hard=Array.isArray(value.hardFailures)?value.hardFailures:[];
      const critical=Array.isArray(value.criticalAxisFailures)?value.criticalAxisFailures:[];
      return {name,value,index,repair,threshold,pass:Number(value.totalScore)>=threshold&&hard.length===0&&critical.length===0};
    })
    .sort((a,b)=>a.repair-b.repair||a.index-b.index);
}
function activeSeed(state={},gameId=''){
  return (Array.isArray(state.seeds)?state.seeds:[]).find(row=>clean(row?.gameId)===gameId&&clean(row?.status).toUpperCase()==='ACTIVE')||null;
}
function preservationContractValid(seed={},design={}){
  const preservationSeed=seed?.REUSE_EXISTING_GAMEPLAY_IMPLEMENTATION===true
    &&clean(seed?.OWNER_REBUILD_MODE).toUpperCase()==='PRESERVATION_PRESENTATION_UPGRADE';
  if(!preservationSeed)return true;
  const contract=design?.preservationContract;
  const requiredLocked=['WORLD_AND_REGIONS','STORY_AND_QUESTS','COMBAT_RULES','CRAFTING_RECIPES_AND_COSTS','SAVE_KEY_AND_SCHEMA_MEANING','PROGRESSION','BALANCE_VALUES','DROPS_AND_REWARDS','HIT_AND_COOLDOWN_SEMANTICS','MULTIPLAYER_MODE'];
  const requiredPasses=['ASSET_ADAPTATION','LIVING_MOTION','ANIMATION_FEEL','VFX','AUDIO_FEEL','CAMERA_LANGUAGE','POLISH_MOBILE'];
  const locked=new Set(Array.isArray(contract?.lockedSemantics)?contract.lockedSemantics:[]);
  const passes=new Set(Array.isArray(contract?.presentationPasses)?contract.presentationPasses:[]);
  return contract?.mode==='PRESERVATION_PRESENTATION_UPGRADE'
    &&contract?.sourceOfTruth==='EXISTING_IMPLEMENTATION_AND_OWNER_SEED'
    &&contract?.gameplayRule==='NO_GAMEPLAY_MECHANIC_ADDITION_REMOVAL_OR_REBALANCE'
    &&Number(contract?.targetSessionMinutes)===Number(seed?.TARGET_SESSION_MINUTES||30)
    &&clean(design?.multiplayerMode).toUpperCase()===clean(seed?.MULTIPLAYER_DESIGN_MODE).toUpperCase()
    &&requiredLocked.every(value=>locked.has(value))
    &&requiredPasses.length===passes.size
    &&requiredPasses.every(value=>passes.has(value));
}

function continuousDesignContractValid(design={}){
  return Boolean(
    design?.conceptBlueprint
    &&Array.isArray(design?.designAlternatives)&&design.designAlternatives.length>=2
    &&design?.contentDiversityPlan
    &&design?.creativeChallenge
    &&design?.narrativeDirection
  );
}
function recoveryDesignEvolution(seed={},checkpoint={}){
  return {
    ownerRequestEventId:clean(seed?.ownerRequestInstanceId||seed?.ownerResetRevision||'')||null,
    ownerRepeatedRequestCreatesNewRevision:seed?.ownerRepeatedRequestCreatesNewDesignRevision===true,
    autoSignalSource:clean(process.env.DESIGN_EVOLUTION_SIGNAL_SOURCE||checkpoint?.designEvolution?.autoSignalSource)||null,
    autoSignalFingerprint:clean(process.env.DESIGN_EVOLUTION_SIGNAL_FINGERPRINT||checkpoint?.designEvolution?.autoSignalFingerprint)||null,
    autoSignalReason:clean(process.env.DESIGN_EVOLUTION_SIGNAL_REASON||checkpoint?.designEvolution?.autoSignalReason)||null,
    passIsCheckpointNotTerminal:true,
    unlimitedRevisions:true
  };
}

export function materializeDeterministicCheckpointCandidate({gameId,date,root='.'}={}){
  gameId=clean(gameId);date=clean(date)||kstDate();
  if(!gameId)throw new Error('DESIGN_CHECKPOINT_RECOVERY_GAME_ID_REQUIRED');
  const base=path.join(root,'design',gameId,date);
  const checkpointPath=path.join(base,'design-checkpoint.json');
  const checkpoint=readJson(checkpointPath,null);
  if(!checkpoint)throw new Error(`DESIGN_CHECKPOINT_RECOVERY_MISSING ${checkpointPath}`);

  const roadmap=readJson(path.join(root,'company-learning','platform-release-roadmap.json'),{});
  const authority=roadmap?.developmentLifecycleMachine?.deterministicGateAuthority||{};
  if(authority.enabled!==true||authority.aiMayDecidePassFail!==false)throw new Error('DETERMINISTIC_GATE_AUTHORITY_REQUIRED');

  const seedState=readJson(path.join(root,'game-seed-state.json'),{seeds:[]});
  const seed=activeSeed(seedState,gameId);
  if(!seed)throw new Error(`DESIGN_CHECKPOINT_RECOVERY_ACTIVE_SEED_REQUIRED ${gameId}`);
  if(clean(checkpoint.seedId)!==clean(seed.seedId))throw new Error(`DESIGN_CHECKPOINT_RECOVERY_SEED_MISMATCH ${clean(checkpoint.seedId)} != ${clean(seed.seedId)}`);

  const draft=checkpoint?.phases?.designer_draft;
  if(!draft||typeof draft!=='object'||Array.isArray(draft))throw new Error('DESIGN_CHECKPOINT_RECOVERY_DRAFT_MISSING');

  const rows=deterministicRows(checkpoint);
  const selected=[...rows].reverse().find(row=>row.pass);
  if(!selected){
    const latest=rows.at(-1);
    const err=new Error(`DESIGN_CHECKPOINT_RECOVERY_NO_DETERMINISTIC_PASS score=${Number(latest?.value?.totalScore||0)} hard=${(latest?.value?.hardFailures||[]).join(',')||'NONE'} critical=${(latest?.value?.criticalAxisFailures||[]).join(',')||'NONE'}`);
    err.code='NO_DETERMINISTIC_PASS';
    throw err;
  }

  let revised=deepClone(draft);
  const appliedRepairs=[];
  for(let n=1;n<=selected.repair;n+=1){
    const patch=checkpoint?.phases?.[`designer_pre_gate_repair_${n}`];
    if(!patch||typeof patch!=='object'||Array.isArray(patch))continue;
    revised=merge(revised,patch);
    appliedRepairs.push(`designer_pre_gate_repair_${n}`);
  }
  if(!preservationContractValid(seed,revised)){
    const err=new Error('DESIGN_CHECKPOINT_RECOVERY_PRESERVATION_CONTRACT_STALE');
    err.code='PRESERVATION_CONTRACT_STALE';
    throw err;
  }

  if(!continuousDesignContractValid(revised)){
    const err=new Error('DESIGN_CHECKPOINT_RECOVERY_CONTINUOUS_DESIGN_CONTRACT_STALE');
    err.code='CONTINUOUS_DESIGN_CONTRACT_STALE';
    throw err;
  }
  const designEvolution=recoveryDesignEvolution(seed,checkpoint);

  const catalog=readJson(path.join(root,'game-catalog.json'),{games:[]});
  const game=(catalog.games||[]).find(row=>clean(row?.id)===gameId)||{};
  const now=new Date().toISOString();
  const authorModel=clean(checkpoint.effectiveDesignerModel)||clean(checkpoint.effectiveDesignerProvider)||'CHECKPOINT_MODEL';
  const draftFile={
    version:6,gameId,date,productionClass:'DESIGN_ONLY',gameSeedId:clean(seed.seedId),
    authorRole:'DESIGN_AUTHOR_CHECKPOINT',authorModel,designEvolution,
    status:'DESIGN_DRAFT_RECOVERED_FROM_VERIFIED_CHECKPOINT',
    content:deepClone(draft),
    recovery:{source:'design-checkpoint.json',checkpointFingerprint:clean(checkpoint.fingerprint)||null,aiVerdictUsed:false,materializedAt:now}
  };
  const revisedFile={
    version:7,gameId,date,productionClass:'DESIGN_ONLY',tierAlias:3,tier:3,gameSeedId:clean(seed.seedId),
    authorRole:'DESIGN_AUTHOR_CHECKPOINT',authorModel,sameModelAsDraft:true,designEvolution,
    appliedConsensusCount:0,unresolvedConflictCount:0,heldCount:0,status:'DESIGN_BASELINE_CANDIDATE',
    content:revised,
    recovery:{
      source:'design-checkpoint.json',
      checkpointFingerprint:clean(checkpoint.fingerprint)||null,
      deterministicPhase:selected.name,
      deterministicScore:Number(selected.value.totalScore),
      deterministicPassMinimum:selected.threshold,
      hardFailures:[],
      criticalAxisFailures:[],
      appliedRepairs,
      aiReviewUsed:false,
      aiVerdictUsed:false,
      materializedAt:now
    }
  };
  const priorLearning=(Array.isArray(seedState?.seedMaterialLearning?.events)?seedState.seedMaterialLearning.events:[])
    .filter(event=>clean(event?.gameId)===gameId&&clean(event?.reviewStage)==='DESIGN_STRICT_REVIEW').slice(-8);
  const cycle={
    version:7,date,gameId,gameName:clean(game.name||seed.gameName||gameId),productionClass:'DESIGN_ONLY',tierAlias:3,tier:3,
    status:'COMPLETE',policyDocument:'company-learning/platform-release-roadmap.json',
    designEvolution,
    flow:'GAME_SEED_TO_DETERMINISTIC_DESIGN_BASELINE_CANDIDATE',
    gameSeed:{seedId:clean(seed.seedId),category:clean(seed.GAME_CATEGORY),source:'game-seed-state.json',complete:true},
    designer:{role:'DESIGN_AUTHOR_CHECKPOINT',model:authorModel,singleAuthor:true,sameModelRevised:true},
    departments:{
      count:0,roles:[],leadModels:{},distinctLeadModels:[],distinctLeadModelCount:0,leadModelsDistinct:false,modelAudit:{},
      reviewMode:'DETERMINISTIC_EVIDENCE',aiReviewRequired:false,repeatedFatalReview:false
    },
    meeting:{required:false,mode:'DETERMINISTIC_EVIDENCE',conflictCount:0,holdCount:0,allResolved:true,deterministicEvidenceOnly:true},
    disposition:{
      version:2,state:'DETERMINISTIC_EVIDENCE',sameDesignerRevisionAttempted:appliedRepairs.length>0,
      repeatedFiveDepartmentReview:false,fiveDepartmentLeadReviewCompleted:false,
      deterministicGateReviewCompleted:true,unanimousFatalDiscard:false,discardVotes:0,commonFatalCriteria:[],
      source:selected.name
    },
    runtimeMetrics:{
      source:'design-checkpoint.json',
      checkpointReused:true,
      completedPhases:Array.isArray(checkpoint.completedPhases)?checkpoint.completedPhases.length:0,
      deterministicGateScore:Number(selected.value.totalScore),
      deterministicGatePhase:selected.name
    },
    designLearning:{
      candidateCount:priorLearning.length,usedAsDesignContext:priorLearning.length>0,
      positiveTrainingEligible:false,validatedRuntimeRequiredForPositiveTraining:true,
      strictGateBypassAllowed:false
    },
    artbook:{created:false,reason:'DESIGN_BASELINE_GATE_MUST_RUN_FIRST'},
    vibe2Used:false,vibe2LearningContextUsed:priorLearning.length>0,paidApi:false,
    deterministicRecovery:{
      enabled:true,source:'design-checkpoint.json',phase:selected.name,totalScore:Number(selected.value.totalScore),
      passMinimum:selected.threshold,hardFailures:[],criticalAxisFailures:[],aiReviewUsed:false,aiVerdictUsed:false,
      appliedRepairs,recoveredAt:now
    }
  };

  writeJson(path.join(base,'design-draft.json'),draftFile);
  writeJson(path.join(base,'design-revised.json'),revisedFile);
  writeJson(path.join(base,'cycle-status.json'),cycle);
  writeJson(path.join(base,'design-disposition.json'),{
    version:2,gameId,date,state:'DETERMINISTIC_EVIDENCE',reviewAuthority:'DETERMINISTIC_EVIDENCE',
    fiveDepartmentLeadReviewCompleted:false,aiReviewUsed:false,aiVerdictUsed:false,
    deterministicGateReviewCompleted:true,deterministicPhase:selected.name,totalScore:Number(selected.value.totalScore),
    hardFailures:[],criticalAxisFailures:[],unanimousFatalDiscard:false,recordedAt:now
  });
  return {gameId,date,phase:selected.name,totalScore:Number(selected.value.totalScore),passMinimum:selected.threshold,appliedRepairs};
}

function main(){
  try{
    const result=materializeDeterministicCheckpointCandidate({gameId:arg('game-id')||clean(process.env.GAME_ID||process.env.ARTBOOK_GAME_ID),date:arg('date')||clean(process.env.ARTBOOK_DATE||process.env.DESIGN_DATE),root:arg('root')||'.'});
    console.log('DESIGN_DETERMINISTIC_RECOVERY=PASS');
    console.log(`DESIGN_DETERMINISTIC_RECOVERY_GAME=${result.gameId}`);
    console.log(`DESIGN_DETERMINISTIC_RECOVERY_PHASE=${result.phase}`);
    console.log(`DESIGN_DETERMINISTIC_RECOVERY_SCORE=${result.totalScore}`);
    console.log(`DESIGN_DETERMINISTIC_RECOVERY_THRESHOLD=${result.passMinimum}`);
    console.log(`DESIGN_DETERMINISTIC_RECOVERY_REPAIRS=${result.appliedRepairs.join(',')||'NONE'}`);
    console.log('DESIGN_DETERMINISTIC_RECOVERY_AI_VERDICT=NO');
  }catch(error){
    console.error(error?.stack||error?.message||String(error));
    process.exitCode=3;
  }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main();
