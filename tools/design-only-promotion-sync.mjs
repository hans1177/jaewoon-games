// 파일명: tools/design-only-promotion-sync.mjs
// DESIGN_BASELINE_READY + canonical Web game 준비가 끝난 게임을 DEVELOPMENT_CONFIRMED로 승격한다.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {resolveSelectedPlatform,adapterForPlatform} from './company-selected-platform-router.mjs';

const readJson=(file,fallback)=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}};
const writeJson=(file,value)=>fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');
const nowIso=()=>new Date().toISOString();
const selectedPlatformOf=seed=>resolveSelectedPlatform(seed?.INITIAL_TARGET_PLATFORM||'',seed)||'ROBLOX';
const targetSourcePathOf=(gameId,platform)=>`${adapterForPlatform(platform)?.sourceRoot||''}${gameId}`;
const webSourcePathOf=gameId=>`web-games/${gameId}`;
const webEntryPathOf=(root,gameId)=>path.join(root,'web-games',gameId,'index.html');
const canonicalWebQaPass=artbook=>artbook?.canonicalWebGameQaPass===true||artbook?.publication?.canonicalWebGameQaPass===true;

export function promoteReadyDesignSeeds({root='.'}={}){
  const p=(...parts)=>path.join(root,...parts);
  const seedPath=p('game-seed-state.json');
  const portfolioPath=p('autonomous-portfolio.json');
  const catalogPath=p('game-catalog.json');
  const queuePath=p('development-queue.json');
  const state=readJson(seedPath,{version:1,seeds:[]});
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
    if(!fs.existsSync(webEntryPathOf(root,gameId))){skipped.push({gameId,reason:'CANONICAL_WEB_GAME_MISSING'});continue;}
    if(!canonicalWebQaPass(artbook)){skipped.push({gameId,reason:'CANONICAL_WEB_GAME_QA_REQUIRED'});continue;}

    const selectedPlatform=selectedPlatformOf(seed);
    const targetSourcePath=targetSourcePathOf(gameId,selectedPlatform);
    const webSourcePath=webSourcePathOf(gameId);

    seed.productionClass='DEVELOPMENT_CONFIRMED';
    seed.productionTier=2;
    seed.productionClassSource='DESIGN_BASELINE_READY_AND_CANONICAL_WEB_GAME_READY';
    seed.lifecycleState='DEVELOPMENT_CONFIRMED';
    seed.selectedPlatform=selectedPlatform;
    seed.promotion={
      from:'DESIGN_ONLY',to:'DEVELOPMENT_CONFIRMED',reason:'DESIGN_BASELINE_READY_AND_CANONICAL_WEB_GAME_READY',
      selectedPlatform,targetSourcePath,webSourcePath,
      requiredNextValidation:'TARGET_PLATFORM',
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
        developmentFocus:{scores:{playability:0,distinctiveness:0,developmentEfficiency:0,scalability:0,lowBlockage:0},total:0,evidenceNote:'승격 직후. canonical Web game QA는 통과했고 선택 플랫폼 실검증 근거 수집 전.'},
      };
      portfolio.projects.push(project);
    }
    Object.assign(project,{
      productionClass:'DEVELOPMENT_CONFIRMED',productionClassSource:'DESIGN_BASELINE_READY_AND_CANONICAL_WEB_GAME_READY',profileStatus:'DEVELOPMENT_CONFIRMED',
      mode:'CANONICAL_WEB_GAME_AND_SELECTED_PLATFORM_IMPLEMENTATION',productionTier:2,productionTierSource:'DISPLAY_ALIAS_FROM_PRODUCTION_CLASS',
      targetEngine:selectedPlatform,selectedPlatform,targetPlatform:selectedPlatform,targetSourcePath,
      sourcePath:webSourcePath,webArchivePath:webSourcePath,canonicalWebGameRequired:true,canonicalWebGameQaPass:true,
      designBaselineSource:artbook.sourceDesign||null,designArtbookSource:`artbook-submissions/${gameId}/current.json`,
    });

    let game=catalog.games.find(row=>row?.id===gameId);
    if(!game){
      game={id:gameId,name:seed.gameName||gameId,description:'2분류 개발확정 · canonical Web game',genre:['2분류',String(seed.GAME_CATEGORY||'').replaceAll('_',' ')],image:'assets/page-bg-v4.webp',webPath:`/${webSourcePath}/`,hasWebArchive:true,featured:false,homepageArtbookPath:`/artbook-viewer.html?game=${encodeURIComponent(gameId)}`};
      catalog.games.push(game);
    }
    Object.assign(game,{
      webPath:`/${webSourcePath}/`,hasWebArchive:true,canonicalWebGameRequired:true,canonicalWebGameQaPass:true,
      homepageCategory:'development-confirmed',productionClass:'DEVELOPMENT_CONFIRMED',productionClassSource:'DESIGN_BASELINE_READY_AND_CANONICAL_WEB_GAME_READY',
      productionTier:2,productionTierSource:'DISPLAY_ALIAS_FROM_PRODUCTION_CLASS',selectedPlatform,targetPlatform:selectedPlatform,targetSourcePath,productionTarget:selectedPlatform,
      homepageStage:`개발확정 · Web / ${selectedPlatform}`,
      homepageRecentWork:`canonical Web game을 유지하면서 ${selectedPlatform} 실제 플랫폼 검증으로 진행합니다.`,
      homepageWebPlayable:true,homepageArtbookPath:game.homepageArtbookPath||`/artbook-viewer.html?game=${encodeURIComponent(gameId)}`,
    });

    let item=queue.items.find(row=>row?.gameId===gameId);
    if(!item){
      item={
        gameId,seedId:seed.seedId||null,gameName:seed.gameName||gameId,productionClass:'DEVELOPMENT_CONFIRMED',
        selectedPlatform,targetPlatform:selectedPlatform,targetSourcePath,webSourcePath,
        designBaselineSource:artbook.sourceDesign||null,artbookSource:`artbook-submissions/${gameId}/current.json`,enqueuedAt:stamp,
      };
      queue.items.push(item);
    }
    Object.assign(item,{
      productionClass:'DEVELOPMENT_CONFIRMED',selectedPlatform,targetPlatform:selectedPlatform,targetSourcePath,webSourcePath,
      canonicalWebGameRequired:true,canonicalWebGameQaPass:true,sourcePath:targetSourcePath,
      status:'PENDING',currentStep:'TARGET_PLATFORM_SOURCE_BIND',canonicalState:'WAITING_TARGET_PLATFORM_VALIDATION',
      designBaselineSource:artbook.sourceDesign||item.designBaselineSource||null,
      artbookSource:`artbook-submissions/${gameId}/current.json`,routingBlockers:[],updatedAt:stamp,
    });
    for(const legacy of ['webValidationRequired','musicValidationRequired','webValidationPassedAt','webValidationQueuedAt','musicValidationPassed','webValidationEvidencePath'])delete item[legacy];
    promoted.push(gameId);
  }

  state.updatedAt=stamp;
  queue.updatedAt=stamp;
  queue.webGamePolicy='CANONICAL_WEB_GAME_REQUIRED_NO_SEPARATE_WEB_TEST';
  delete queue.webValidationPolicy;
  writeJson(seedPath,state);
  writeJson(portfolioPath,portfolio);
  writeJson(catalogPath,catalog);
  writeJson(queuePath,queue);
  return {promoted,skipped,queueCount:queue.items.length};
}

if(import.meta.url===pathToFileURL(process.argv[1]||'').href){
  const result=promoteReadyDesignSeeds();
  console.log(`DESIGN_PROMOTION_COUNT=${result.promoted.length}`);
  console.log(`DESIGN_PROMOTED_GAME_IDS=${result.promoted.join(',')}`);
  console.log(`DEVELOPMENT_QUEUE_COUNT=${result.queueCount}`);
  if(result.skipped.length)console.log(`DESIGN_PROMOTION_SKIPPED=${JSON.stringify(result.skipped)}`);
}
