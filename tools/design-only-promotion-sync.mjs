// 파일명: tools/design-only-promotion-sync.mjs
// DESIGN_BASELINE_READY 게임을 DEVELOPMENT_CONFIRMED로 승격하고 필수 Web 플레이/음악 검증 큐에 연결한다.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {resolveSelectedPlatform,adapterForPlatform} from './company-selected-platform-router.mjs';
import {materializeOwnerDesignResetSeeds} from './owner-design-reset.mjs';

const readJson=(file,fallback)=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}};
const writeJson=(file,value)=>fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');
const nowIso=()=>new Date().toISOString();
const selectedPlatformOf=seed=>resolveSelectedPlatform(seed?.INITIAL_TARGET_PLATFORM||'',seed)||'ROBLOX';
const targetSourcePathOf=(gameId,platform)=>`${adapterForPlatform(platform)?.sourceRoot||''}${gameId}`;
const webSourcePathOf=gameId=>`web-games/${gameId}`;

function bindRequiredWebStage(item,{gameId,targetSourcePath,stamp}){
  const webSourcePath=webSourcePathOf(gameId);
  item.webSourcePath=webSourcePath;
  item.webValidationRequired=true;
  item.musicValidationRequired=true;
  if(item.webValidationPassedAt&&item.musicValidationPassed===true){
    item.sourcePath=targetSourcePath;
    return;
  }
  item.status='ACTIVE';
  item.currentStep='WEB_PLAYABLE_BOOTSTRAP';
  item.canonicalState='WAITING_WEB_GAMEPLAY_VALIDATION';
  item.sourcePath=webSourcePath;
  item.webValidationQueuedAt=item.webValidationQueuedAt||stamp;
}

export function promoteReadyDesignSeeds({root='.'}={}){
  const p=(...parts)=>path.join(root,...parts);
  const seedPath=p('game-seed-state.json');
  const portfolioPath=p('autonomous-portfolio.json');
  const catalogPath=p('game-catalog.json');
  const queuePath=p('development-queue.json');
  const state=readJson(seedPath,{version:1,seeds:[]});
  const resetResult=materializeOwnerDesignResetSeeds(state,{file:p('owner-design-reset-queue.json')});
  const portfolio=readJson(portfolioPath,{version:1,projects:[]});
  const catalog=readJson(catalogPath,{version:1,games:[]});
  const queue=readJson(queuePath,{version:1,items:[]});
  portfolio.projects ||= [];
  catalog.games ||= [];
  queue.items ||= [];
  const promoted=[];
  const skipped=[];
  const stamp=nowIso();

  for(const seed of state.seeds||[]){
    if(String(seed?.status||'').toUpperCase()!=='ACTIVE')continue;
    const gameId=String(seed?.gameId||'').trim();
    if(!gameId)continue;
    const currentPath=p('artbook-submissions',gameId,'current.json');
    if(!fs.existsSync(currentPath)){skipped.push({gameId,reason:'ARTBOOK_MISSING'});continue;}
    const artbook=readJson(currentPath,null);
    const ready=artbook?.baselineGateState==='DESIGN_BASELINE_READY'
      && artbook?.publication?.baselineReady===true
      && artbook?.published===true
      && artbook?.vibe2Used!==true;
    if(!ready){skipped.push({gameId,reason:'DESIGN_BASELINE_NOT_READY'});continue;}
    const selectedPlatform=selectedPlatformOf(seed);
    const targetSourcePath=targetSourcePathOf(gameId,selectedPlatform);
    const webSourcePath=webSourcePathOf(gameId);

    seed.productionClass='DEVELOPMENT_CONFIRMED';
    seed.productionTier=2;
    seed.productionClassSource='DESIGN_BASELINE_READY';
    seed.lifecycleState='DEVELOPMENT_CONFIRMED';
    seed.selectedPlatform=selectedPlatform;
    seed.promotion={
      from:'DESIGN_ONLY',to:'DEVELOPMENT_CONFIRMED',reason:'DESIGN_BASELINE_READY',
      selectedPlatform,targetSourcePath,webSourcePath,
      requiredFirstValidation:'WEB_GAMEPLAY_AND_MUSIC',
      designBaselineSource:artbook.sourceDesign||null,
      artbookSource:`artbook-submissions/${gameId}/current.json`,
      promotedAt:seed?.promotion?.promotedAt||stamp,
    };

    let project=portfolio.projects.find(row=>row?.slug===gameId);
    if(!project){
      project={
        id:`SEED-${seed.seedId||gameId}`,slug:gameId,name:seed.gameName||gameId,
        sourcePath:webSourcePath,webArchivePath:webSourcePath,
        protectedValues:['core-loop','design-baseline','save-meaning'],
        developmentFocus:{scores:{playability:0,distinctiveness:0,developmentEfficiency:0,scalability:0,lowBlockage:0},total:0,evidenceNote:'승격 직후. Web 플레이/음악 검증 및 선택 플랫폼 실검증 근거 수집 전.'},
      };
      portfolio.projects.push(project);
    }
    Object.assign(project,{
      productionClass:'DEVELOPMENT_CONFIRMED',productionClassSource:'DESIGN_BASELINE_READY',profileStatus:'DEVELOPMENT_CONFIRMED',
      mode:'WEB_VALIDATION_THEN_SELECTED_PLATFORM_IMPLEMENTATION',productionTier:2,productionTierSource:'DISPLAY_ALIAS_FROM_PRODUCTION_CLASS',
      targetEngine:selectedPlatform,selectedPlatform,targetPlatform:selectedPlatform,targetSourcePath,
      sourcePath:project.webValidationPassedAt?targetSourcePath:webSourcePath,
      webArchivePath:project.webArchivePath||webSourcePath,
      webValidationRequired:true,musicValidationRequired:true,
      designBaselineSource:artbook.sourceDesign||null,designArtbookSource:`artbook-submissions/${gameId}/current.json`,
    });

    let game=catalog.games.find(row=>row?.id===gameId);
    if(!game){
      game={id:gameId,name:seed.gameName||gameId,description:'2분류 개발확정 · DESIGN_BASELINE_READY 승격',genre:['2분류',String(seed.GAME_CATEGORY||'').replaceAll('_',' ')],image:'assets/page-bg-v4.webp',webPath:`/${webSourcePath}/`,hasWebArchive:false,featured:false,homepageArtbookPath:`/artbook-viewer.html?game=${encodeURIComponent(gameId)}`};
      catalog.games.push(game);
    }
    Object.assign(game,{
      homepageCategory:'development-confirmed',productionClass:'DEVELOPMENT_CONFIRMED',productionClassSource:'DESIGN_BASELINE_READY',
      productionTier:2,productionTierSource:'DISPLAY_ALIAS_FROM_PRODUCTION_CLASS',selectedPlatform,targetPlatform:selectedPlatform,targetSourcePath,productionTarget:selectedPlatform,
      homepageStage:'2분류 개발확정 · Web 플레이/음악 검증 준비',
      homepageRecentWork:`DESIGN_BASELINE_READY 통과. Web 실제 플레이와 음악 런타임 검증 후 ${selectedPlatform} 검증으로 진행.`,
      homepageWebPlayable:Boolean(game.hasWebArchive),homepageArtbookPath:game.homepageArtbookPath||`/artbook-viewer.html?game=${encodeURIComponent(gameId)}`,
    });

    let item=queue.items.find(row=>row?.gameId===gameId);
    if(!item){
      item={
        gameId,seedId:seed.seedId||null,gameName:seed.gameName||gameId,productionClass:'DEVELOPMENT_CONFIRMED',
        selectedPlatform,targetPlatform:selectedPlatform,targetSourcePath,webSourcePath,
        designBaselineSource:artbook.sourceDesign||null,artbookSource:`artbook-submissions/${gameId}/current.json`,enqueuedAt:stamp,
      };
      queue.items.push(item);
    }else{
      item.productionClass='DEVELOPMENT_CONFIRMED';
      item.selectedPlatform=selectedPlatform;
      item.targetPlatform=selectedPlatform;
      item.targetSourcePath=targetSourcePath;
      item.webSourcePath=item.webSourcePath||webSourcePath;
      item.designBaselineSource=artbook.sourceDesign||item.designBaselineSource||null;
      item.artbookSource=`artbook-submissions/${gameId}/current.json`;
    }
    bindRequiredWebStage(item,{gameId,targetSourcePath,stamp});
    promoted.push(gameId);
  }

  state.updatedAt=stamp;
  queue.updatedAt=stamp;
  queue.webValidationPolicy='REQUIRED_BEFORE_TARGET_PLATFORM';
  writeJson(seedPath,state);
  writeJson(portfolioPath,portfolio);
  writeJson(catalogPath,catalog);
  writeJson(queuePath,queue);
  return {promoted,skipped,queueCount:queue.items.length,ownerResetSeedsMaterialized:resetResult.changed};
}

if(import.meta.url===pathToFileURL(process.argv[1]||'').href){
  const result=promoteReadyDesignSeeds();
  console.log(`DESIGN_PROMOTION_COUNT=${result.promoted.length}`);
  console.log(`DESIGN_PROMOTED_GAME_IDS=${result.promoted.join(',')}`);
  console.log(`DEVELOPMENT_QUEUE_COUNT=${result.queueCount}`);
  console.log(`OWNER_RESET_SEEDS_MATERIALIZED=${result.ownerResetSeedsMaterialized.join(',')}`);
  if(result.skipped.length)console.log(`DESIGN_PROMOTION_SKIPPED=${JSON.stringify(result.skipped)}`);
}
