// 파일명: tools/design-only-promotion-sync.mjs
// DESIGN_BASELINE_READY + strict design PASS 게임만 DEVELOPMENT_CONFIRMED로 승격하고 필수 Web 플레이/음악 검증 큐에 연결한다.
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
const strictDesignReviewPath=(root,artbook,gameId)=>{
  const source=String(artbook?.sourceDesign||'').trim();
  if(source)return path.join(root,path.dirname(source),'strict-design-review.json');
  const date=String(artbook?.date||artbook?.createdAt||'').slice(0,10);
  return date?path.join(root,'design',gameId,date,'strict-design-review.json'):'';
};
const strictDesignPass=(root,artbook,gameId)=>{
  const file=strictDesignReviewPath(root,artbook,gameId);
  const review=file?readJson(file,null):null;
  const pass=review?.verdict==='PASS'&&Number(review?.totalScore)>=90&&Array.isArray(review?.hardFailures)&&review.hardFailures.length===0;
  return {pass,file:file||null,review};
};

function bindRequiredWebStage(item,{gameId,targetSourcePath,stamp}){
  const webSourcePath=webSourcePathOf(gameId);
  item.webSourcePath=webSourcePath;
  item.webValidationRequired=true;
  item.musicValidationRequired=true;
  item.homepageTestCandidate=false;
  item.homepageTestScore=null;
  item.homepageTestVerdict='WAITING_WEB_STRICT_REVIEW';
  if(item.webValidationPassedAt&&item.musicValidationPassed===true&&item.strictImplementationVerdict==='PASS'&&Number(item.strictImplementationScore)>=90){
    item.sourcePath=targetSourcePath;
    item.homepageTestCandidate=true;
    item.homepageTestScore=Number(item.strictImplementationScore);
    item.homepageTestVerdict='PASS';
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
    const strict=strictDesignPass(root,artbook,gameId);
    if(!strict.pass){
      seed.strictDesignReview={verdict:strict.review?.verdict||'MISSING',totalScore:Number(strict.review?.totalScore||0),hardFailures:Array.isArray(strict.review?.hardFailures)?strict.review.hardFailures:[],evidencePath:strict.file};
      seed.lifecycleState=String(strict.review?.verdict||'REVISE').toUpperCase()==='REBUILD'?'DESIGN_REBUILD_REQUIRED':'DESIGN_REVISION_REQUIRED';
      skipped.push({gameId,reason:'STRICT_DESIGN_REVIEW_NOT_PASS',verdict:seed.strictDesignReview.verdict,totalScore:seed.strictDesignReview.totalScore});
      continue;
    }
    const selectedPlatform=selectedPlatformOf(seed);
    const targetSourcePath=targetSourcePathOf(gameId,selectedPlatform);
    const webSourcePath=webSourcePathOf(gameId);

    seed.productionClass='DEVELOPMENT_CONFIRMED';
    seed.productionTier=2;
    seed.productionClassSource='DESIGN_BASELINE_READY_STRICT_PASS';
    seed.lifecycleState='DEVELOPMENT_CONFIRMED';
    seed.selectedPlatform=selectedPlatform;
    seed.strictDesignReview={verdict:'PASS',totalScore:Number(strict.review.totalScore),hardFailures:[],evidencePath:strict.file};
    seed.promotion={
      from:'DESIGN_ONLY',to:'DEVELOPMENT_CONFIRMED',reason:'DESIGN_BASELINE_READY_STRICT_PASS',
      selectedPlatform,targetSourcePath,webSourcePath,
      requiredFirstValidation:'WEB_GAMEPLAY_AND_MUSIC_STRICT_REVIEW',
      designBaselineSource:artbook.sourceDesign||null,
      artbookSource:`artbook-submissions/${gameId}/current.json`,
      strictDesignReviewSource:strict.file,
      strictDesignScore:Number(strict.review.totalScore),
      promotedAt:seed?.promotion?.promotedAt||stamp,
    };

    let project=portfolio.projects.find(row=>row?.slug===gameId);
    if(!project){
      project={
        id:`SEED-${seed.seedId||gameId}`,slug:gameId,name:seed.gameName||gameId,
        sourcePath:webSourcePath,webArchivePath:webSourcePath,
        protectedValues:['core-loop','design-baseline','save-meaning'],
        developmentFocus:{scores:{playability:0,distinctiveness:0,developmentEfficiency:0,scalability:0,lowBlockage:0},total:0,evidenceNote:'승격 직후. Web 플레이/음악/강심사 및 선택 플랫폼 실검증 근거 수집 전.'},
      };
      portfolio.projects.push(project);
    }
    Object.assign(project,{
      productionClass:'DEVELOPMENT_CONFIRMED',productionClassSource:'DESIGN_BASELINE_READY_STRICT_PASS',profileStatus:'DEVELOPMENT_CONFIRMED',
      mode:'WEB_VALIDATION_THEN_SELECTED_PLATFORM_IMPLEMENTATION',productionTier:2,productionTierSource:'DISPLAY_ALIAS_FROM_PRODUCTION_CLASS',
      targetEngine:selectedPlatform,selectedPlatform,targetPlatform:selectedPlatform,targetSourcePath,
      sourcePath:project.webValidationPassedAt?targetSourcePath:webSourcePath,
      webArchivePath:project.webArchivePath||webSourcePath,
      webValidationRequired:true,musicValidationRequired:true,
      strictDesignScore:Number(strict.review.totalScore),
      designBaselineSource:artbook.sourceDesign||null,designArtbookSource:`artbook-submissions/${gameId}/current.json`,
    });

    let game=catalog.games.find(row=>row?.id===gameId);
    if(!game){
      game={id:gameId,name:seed.gameName||gameId,description:'개발확정 · Strict Design PASS',genre:[String(seed.GAME_CATEGORY||'').replaceAll('_',' ')],image:'',webPath:`/${webSourcePath}/`,hasWebArchive:false,featured:false,homepageArtbookPath:`/artbook-viewer.html?game=${encodeURIComponent(gameId)}`};
      catalog.games.push(game);
    }
    Object.assign(game,{
      homepageCategory:'development-confirmed',productionClass:'DEVELOPMENT_CONFIRMED',productionClassSource:'DESIGN_BASELINE_READY_STRICT_PASS',
      productionTier:2,productionTierSource:'DISPLAY_ALIAS_FROM_PRODUCTION_CLASS',selectedPlatform,targetPlatform:selectedPlatform,targetSourcePath,productionTarget:selectedPlatform,
      strictDesignScore:Number(strict.review.totalScore),homepageOfficialCard:false,homepageTestCandidate:false,homepageTestScore:null,homepageReviewState:'WAITING_WEB_STRICT_REVIEW',
      homepageStage:'개발확정 · Web 강심사 준비',
      homepageRecentWork:`Strict Design ${Number(strict.review.totalScore)}점 PASS. Web 실제 플레이·음악·구현 강심사 후 테스트 선반 후보가 된다.`,
      homepageWebPlayable:false,homepageArtbookPath:game.homepageArtbookPath||`/artbook-viewer.html?game=${encodeURIComponent(gameId)}`,
    });

    let item=queue.items.find(row=>row?.gameId===gameId);
    if(!item){
      item={
        gameId,seedId:seed.seedId||null,gameName:seed.gameName||gameId,productionClass:'DEVELOPMENT_CONFIRMED',
        selectedPlatform,targetPlatform:selectedPlatform,targetSourcePath,webSourcePath,
        designBaselineSource:artbook.sourceDesign||null,artbookSource:`artbook-submissions/${gameId}/current.json`,strictDesignScore:Number(strict.review.totalScore),enqueuedAt:stamp,
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
      item.strictDesignScore=Number(strict.review.totalScore);
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
  console.log(`OWNER_RESET_SEEDS_MATERIALIZED=${resetResult?.ownerResetSeedsMaterialized||result.ownerResetSeedsMaterialized.join(',')}`);
  if(result.skipped.length)console.log(`DESIGN_PROMOTION_SKIPPED=${JSON.stringify(result.skipped)}`);
}
