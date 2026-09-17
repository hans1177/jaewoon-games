// Canonical DEVELOPMENT_CONFIRMED queue reconciliation.
// GAME_CATALOG lifecycle is authoritative. Existing progress is preserved.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const ACTIVE_STATES=new Set(['ACTIVE','REBUILD']);
const readJson=(file,fallback)=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}};
const writeJson=(file,value)=>fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');
const clean=value=>String(value??'').trim();
const upper=value=>clean(value).toUpperCase();
const webSourcePathOf=gameId=>`web-games/${gameId}`;

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

export function reconcileDevelopmentQueue({root='.'}={}){
  const catalogPath=path.join(root,'game-catalog.json');
  const queuePath=path.join(root,'development-queue.json');
  const catalog=readJson(catalogPath,{version:1,games:[]});
  const queue=readJson(queuePath,{version:1,items:[]});
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
      currentStep:hasExistingWeb?'WEB_GAMEPLAY_AND_MUSIC_VALIDATION':'WEB_PLAYABLE_BOOTSTRAP',
      canonicalState:'WAITING_WEB_GAMEPLAY_VALIDATION',
      webValidationRequired:true,
      musicValidationRequired:true,
      homepageTestCandidate:false,
      homepageTestScore:null,
      homepageTestVerdict:'WAITING_WEB_STRICT_REVIEW',
      postPromotionArtbookRequired:false,
      postWebArtbookRequired:true,
      artbookTiming:'AFTER_WEB_STRICT_REVIEW_AT_80_OR_HIGHER',
      existingGameContinuation:hasExistingWeb,
      preservationPolicy:'PRESERVE_EXISTING_REAL_GAME_BEFORE_REGENERATION',
      queueSource:'CANONICAL_DEVELOPMENT_QUEUE_RECONCILE',
      enqueuedAt:stamp,
      webValidationQueuedAt:stamp
    };
    next.push(item);
    queuedIds.add(gameId);
    created.push(gameId);
  }

  const before=JSON.stringify(queue.items);
  const after=JSON.stringify(next);
  const changed=before!==after||duplicateRemoved>0;
  if(changed){
    queue.items=next;
    queue.updatedAt=stamp;
    queue.reconciliationPolicy='CATALOG_ACTIVE_REBUILD_DEVELOPMENT_CONFIRMED_AUTO_GUARANTEE';
    writeJson(queuePath,queue);
  }
  return {changed,created,removed,duplicateRemoved,preserved,queueCount:next.length};
}

if(import.meta.url===pathToFileURL(process.argv[1]||'').href){
  const result=reconcileDevelopmentQueue({root:process.cwd()});
  console.log(`DEVELOPMENT_QUEUE_RECONCILE_CHANGED=${result.changed?'YES':'NO'}`);
  console.log(`DEVELOPMENT_QUEUE_CREATED=${result.created.join(',')||'NONE'}`);
  console.log(`DEVELOPMENT_QUEUE_REMOVED=${result.removed.join(',')||'NONE'}`);
  console.log(`DEVELOPMENT_QUEUE_DUPLICATES_REMOVED=${result.duplicateRemoved}`);
  console.log(`DEVELOPMENT_QUEUE_COUNT=${result.queueCount}`);
}