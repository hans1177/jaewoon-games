// Canonical DEVELOPMENT_CONFIRMED queue reconciliation.
// GAME_CATALOG lifecycle is authoritative. Existing progress is preserved.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const ACTIVE_STATES=new Set(['ACTIVE','REBUILD']);
const MACHINE_POLICY_SOURCE='company-learning/platform-release-roadmap.json';
const readJson=(file,fallback)=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}};
const writeJson=(file,value)=>fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');
const clean=value=>String(value??'').trim();
const upper=value=>clean(value).toUpperCase();
const webSourcePathOf=gameId=>`web-games/${gameId}`;
const webResetTokenOf=game=>clean(game?.productionClassSource||game?.lifecycleReason||'OWNER_WEB_DEVELOPMENT_RESET');

function latestDesignBaseline(root,gameId){
  const gameRoot=path.join(root,'design',gameId);
  if(!fs.existsSync(gameRoot))return null;
  const dates=fs.readdirSync(gameRoot,{withFileTypes:true}).filter(x=>x.isDirectory()).map(x=>x.name).sort().reverse();
  for(const date of dates){
    const revised=path.join(gameRoot,date,'design-revised.json');
    const status=readJson(path.join(gameRoot,date,'cycle-status.json'),null);
    if(!fs.existsSync(revised))continue;
    if(status?.baselineGate?.state==='DESIGN_BASELINE_READY'&&status?.baselineGate?.ready===true){
      return {date,source:path.relative(root,revised).replaceAll('\\','/')};
    }
  }
  return null;
}

function mergeDuplicate(base,extra){
  for(const [key,value] of Object.entries(extra||{})){
    if(base[key]===undefined||base[key]===null||base[key]==='')base[key]=value;
  }
  return base;
}

function applyOwnerWebDevelopmentReset(item,game,stamp){
  if(game?.webDevelopmentResetRequired!==true)return false;
  const token=webResetTokenOf(game);
  if(item.ownerWebDevelopmentResetAppliedFor===token)return false;
  item.currentStep='FULL_APPROVED_SCOPE_WEB_COMPANION_BOOTSTRAP';
  item.canonicalState='RETURN_TO_WEB_DEVELOPMENT_FOR_CONTENT_EXPANSION';
  item.status='ACTIVE';
  item.webValidationRequired=true;
  item.musicValidationRequired=true;
  item.webValidationPassedAt=null;
  item.musicValidationPassed=false;
  item.webPromotionRevalidationPassed=false;
  item.formalImplementationPassed=false;
  item.formalImplementationVerdict='REVISE';
  item.homepageTestEligible=false;
  item.homepageTestCandidate=false;
  item.homepageTestScore=null;
  item.homepageTestVerdict='WAITING_CONTENT_DEVELOPMENT_REWORK';
  item.webInitialCyclePassed=false;
  item.webInitialCyclePassedAt='';
  item.webInitialCycleEvidencePath='';
  item.webInitialCycleSourcePath='';
  item.webInitialCycleSourceIndexSha256='';
  item.webInitialCycleDesignBaselineSha256='';
  item.webInitialCycleValidationSchemaVersion=0;
  item.webInitialCycleStrictScore=null;
  item.webInitialCycleStrictReviewPath='';
  item.webInitialCycleSourceRevision='';
  item.webInitialCycleMusicValidationPassed=false;
  item.routingBlockers=[];
  item.resumeStage='FULL_APPROVED_SCOPE_WEB_COMPANION_BOOTSTRAP';
  item.failureCount=0;
  item.executionEvidence=null;
  item.ownerWebDevelopmentResetAppliedFor=token;
  item.ownerWebDevelopmentResetAppliedAt=stamp;
  item.updatedAt=stamp;
  return true;
}

export function reconcileDevelopmentQueue({root='.'}={}){
  const catalogPath=path.join(root,'game-catalog.json');
  const queuePath=path.join(root,'development-queue.json');
  const catalog=readJson(catalogPath,{version:1,games:[]});
  const queue=readJson(queuePath,{version:1,items:[]});
  const roadmap=readJson(path.join(root,MACHINE_POLICY_SOURCE),{});
  const developmentGameWipMax=Number(roadmap?.developmentSpeedExecution?.globalSelectedPlatformDevelopmentWipMax||0);
  catalog.games ||= [];
  queue.items ||= [];

  const catalogById=new Map(catalog.games.map(game=>[clean(game?.id),game]).filter(([id])=>id));
  const unique=new Map();
  let duplicateRemoved=0;
  for(const row of queue.items){
    const gameId=clean(row?.gameId);
    if(!gameId)continue;
    if(unique.has(gameId)){
      mergeDuplicate(unique.get(gameId),row);
      duplicateRemoved++;
    }else unique.set(gameId,{...row});
  }

  const next=[];
  const removed=[];
  const created=[];
  const preserved=[];
  const reset=[];
  const stamp=new Date().toISOString();

  for(const [gameId,item] of unique){
    const game=catalogById.get(gameId);
    const lifecycle=upper(game?.lifecycleState||'ACTIVE');
    const eligible=Boolean(game)&&upper(game?.productionClass)==='DEVELOPMENT_CONFIRMED'&&ACTIVE_STATES.has(lifecycle);
    if(!eligible){removed.push(gameId);continue;}
    item.productionClass='DEVELOPMENT_CONFIRMED';
    item.lifecycleState=lifecycle;
    item.status='ACTIVE';
    item.gameName=item.gameName||game.name||gameId;
    item.webSourcePath=item.webSourcePath||webSourcePathOf(gameId);
    item.sourcePath=item.sourcePath||item.webSourcePath;
    item.webValidationRequired=true;
    item.musicValidationRequired=true;
    item.homepageTestCandidate=item.homepageTestCandidate===true;
    if(item.postPromotionArtbookRequired===undefined)item.postPromotionArtbookRequired=false;
    if(item.postWebArtbookRequired===undefined)item.postWebArtbookRequired=true;
    if(!item.artbookTiming)item.artbookTiming='AFTER_WEB_STRICT_REVIEW_AT_80_OR_HIGHER';
    if(!item.selectedPlatform&&game.selectedPlatform)item.selectedPlatform=game.selectedPlatform;
    if(!item.targetPlatform&&game.selectedPlatform)item.targetPlatform=game.selectedPlatform;
    const hasExistingWeb=fs.existsSync(path.join(root,item.webSourcePath,'index.html'));
    if(applyOwnerWebDevelopmentReset(item,game,stamp)){
      reset.push(gameId);
    }else if(hasExistingWeb){
      if(item.designComplete===undefined)item.designComplete=true;
      if(!item.designGateState)item.designGateState='DESIGN_COMPLETE_EXISTING_GAME_CONTINUATION';
      if(!item.currentStep||item.currentStep==='WEB_PLAYABLE_BOOTSTRAP')item.currentStep='WEB_GAMEPLAY_AND_MUSIC_VALIDATION';
      if(!item.canonicalState||item.canonicalState==='WAITING_WEB_PLAYABLE_BOOTSTRAP')item.canonicalState='WAITING_WEB_GAMEPLAY_VALIDATION';
      item.existingGameContinuation=true;
    }
    next.push(item);
    preserved.push(gameId);
  }

  const queuedIds=new Set(next.map(row=>clean(row.gameId)));
  for(const game of catalog.games){
    const gameId=clean(game?.id);
    const lifecycle=upper(game?.lifecycleState||'ACTIVE');
    if(!gameId||upper(game?.productionClass)!=='DEVELOPMENT_CONFIRMED'||!ACTIVE_STATES.has(lifecycle)||queuedIds.has(gameId))continue;
    const webSourcePath=webSourcePathOf(gameId);
    const hasExistingWeb=fs.existsSync(path.join(root,webSourcePath,'index.html'));
    const baseline=latestDesignBaseline(root,gameId);
    const selectedPlatform=clean(game.selectedPlatform||game.targetPlatform||'');
    const forceWebDevelopment=game?.webDevelopmentResetRequired===true;
    const item={
      gameId,
      seedId:null,
      gameName:game.name||gameId,
      productionClass:'DEVELOPMENT_CONFIRMED',
      lifecycleState:lifecycle,
      status:'ACTIVE',
      sourcePath:webSourcePath,
      webSourcePath,
      selectedPlatform:selectedPlatform||null,
      targetPlatform:selectedPlatform||null,
      designBaselineSource:baseline?.source||null,
      designDate:baseline?.date||null,
      designComplete:hasExistingWeb||Boolean(baseline),
      designGateState:hasExistingWeb?'DESIGN_COMPLETE_EXISTING_GAME_CONTINUATION':baseline?'DESIGN_BASELINE_READY':'WAITING_DESIGN_BASELINE',
      currentStep:forceWebDevelopment?'FULL_APPROVED_SCOPE_WEB_COMPANION_BOOTSTRAP':hasExistingWeb?'WEB_GAMEPLAY_AND_MUSIC_VALIDATION':'WEB_PLAYABLE_BOOTSTRAP',
      canonicalState:forceWebDevelopment?'RETURN_TO_WEB_DEVELOPMENT_FOR_CONTENT_EXPANSION':hasExistingWeb?'WAITING_WEB_GAMEPLAY_VALIDATION':'WAITING_WEB_PLAYABLE_BOOTSTRAP',
      webValidationRequired:true,
      musicValidationRequired:true,
      webValidationPassedAt:null,
      musicValidationPassed:false,
      homepageTestEligible:false,
      homepageTestCandidate:false,
      homepageTestScore:null,
      homepageTestVerdict:forceWebDevelopment?'WAITING_CONTENT_DEVELOPMENT_REWORK':'WAITING_WEB_STRICT_REVIEW',
      formalImplementationPassed:false,
      formalImplementationVerdict:forceWebDevelopment?'REVISE':null,
      webPromotionRevalidationPassed:false,
      postPromotionArtbookRequired:false,
      postWebArtbookRequired:true,
      artbookTiming:'AFTER_WEB_STRICT_REVIEW_AT_80_OR_HIGHER',
      existingGameContinuation:hasExistingWeb,
      preservationPolicy:'PRESERVE_EXISTING_REAL_GAME_BEFORE_REGENERATION',
      queueSource:'CANONICAL_DEVELOPMENT_QUEUE_RECONCILE',
      enqueuedAt:stamp,
      webValidationQueuedAt:stamp,
      resumeStage:forceWebDevelopment?'FULL_APPROVED_SCOPE_WEB_COMPANION_BOOTSTRAP':null,
      failureCount:0,
      routingBlockers:[],
      ownerWebDevelopmentResetAppliedFor:forceWebDevelopment?webResetTokenOf(game):null,
      ownerWebDevelopmentResetAppliedAt:forceWebDevelopment?stamp:null
    };
    next.push(item);
    queuedIds.add(gameId);
    created.push(gameId);
    if(forceWebDevelopment)reset.push(gameId);
  }

  const before=JSON.stringify(queue.items);
  const after=JSON.stringify(next);
  const policyChanged=clean(queue.routerPolicy)!==MACHINE_POLICY_SOURCE;
  const wipChanged=Number.isInteger(developmentGameWipMax)&&developmentGameWipMax>0&&Number(queue.developmentGameWipMax)!==developmentGameWipMax;
  const changed=before!==after||duplicateRemoved>0||policyChanged||wipChanged;
  if(changed){
    queue.items=next;
    queue.routerPolicy=MACHINE_POLICY_SOURCE;
    if(Number.isInteger(developmentGameWipMax)&&developmentGameWipMax>0)queue.developmentGameWipMax=developmentGameWipMax;
    queue.updatedAt=stamp;
    queue.reconciliationPolicy='CATALOG_ACTIVE_REBUILD_DEVELOPMENT_CONFIRMED_AUTO_GUARANTEE';
    writeJson(queuePath,queue);
  }
  return {changed,created,removed,reset,duplicateRemoved,preserved,queueCount:next.length,routerPolicy:MACHINE_POLICY_SOURCE,developmentGameWipMax:Number(queue.developmentGameWipMax||0)};
}

if(import.meta.url===pathToFileURL(process.argv[1]||'').href){
  const result=reconcileDevelopmentQueue({root:process.cwd()});
  console.log(`DEVELOPMENT_QUEUE_RECONCILE_CHANGED=${result.changed?'YES':'NO'}`);
  console.log(`DEVELOPMENT_QUEUE_CREATED=${result.created.join(',')||'NONE'}`);
  console.log(`DEVELOPMENT_QUEUE_REMOVED=${result.removed.join(',')||'NONE'}`);
  console.log(`DEVELOPMENT_QUEUE_WEB_RESET=${result.reset.join(',')||'NONE'}`);
  console.log(`DEVELOPMENT_QUEUE_DUPLICATES_REMOVED=${result.duplicateRemoved}`);
  console.log(`DEVELOPMENT_QUEUE_COUNT=${result.queueCount}`);
  console.log(`DEVELOPMENT_QUEUE_ROUTER_POLICY=${result.routerPolicy}`);
  console.log(`DEVELOPMENT_QUEUE_WIP_MAX=${result.developmentGameWipMax}`);
}
