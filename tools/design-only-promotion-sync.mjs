// 파일명: tools/design-only-promotion-sync.mjs
// DESIGN_BASELINE_READY + strict design PASS(80+) 게임을 아트북 선행 없이 DEVELOPMENT_CONFIRMED로 승격하고 즉시 Web 검증으로 보낸다.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {resolveSelectedPlatform,adapterForPlatform} from './company-selected-platform-router.mjs';
import {materializeOwnerDesignResetSeeds} from './owner-design-reset.mjs';

const DESIGN_PASS_THRESHOLD=80;
const EXCELLENT_THRESHOLD=90;
const readJson=(file,fallback)=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}};
const writeJson=(file,value)=>fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');
const nowIso=()=>new Date().toISOString();
const selectedPlatformOf=seed=>resolveSelectedPlatform(seed?.INITIAL_TARGET_PLATFORM||'',seed)||'ROBLOX';
const targetSourcePathOf=(gameId,platform)=>`${adapterForPlatform(platform)?.sourceRoot||''}${gameId}`;
const webSourcePathOf=gameId=>`web-games/${gameId}`;

function latestReadyDesign(root,gameId){
  const gameRoot=path.join(root,'design',gameId);
  if(!fs.existsSync(gameRoot))return null;
  const dates=fs.readdirSync(gameRoot,{withFileTypes:true}).filter(x=>x.isDirectory()).map(x=>x.name).sort().reverse();
  for(const date of dates){
    const base=path.join(gameRoot,date);
    const status=readJson(path.join(base,'cycle-status.json'),null);
    const review=readJson(path.join(base,'strict-design-review.json'),null);
    const revised=path.join(base,'design-revised.json');
    const baselineReady=status?.baselineGate?.state==='DESIGN_BASELINE_READY'&&status?.baselineGate?.ready===true&&fs.existsSync(revised);
    if(!baselineReady)continue;
    return {
      date,
      status,
      review,
      designSource:path.relative(root,revised).replaceAll('\\','/'),
      strictSource:path.relative(root,path.join(base,'strict-design-review.json')).replaceAll('\\','/'),
    };
  }
  return null;
}
function strictDesignPass(design){
  const review=design?.review;
  const pass=review?.verdict==='PASS'&&Number(review?.totalScore)>=DESIGN_PASS_THRESHOLD&&Array.isArray(review?.hardFailures)&&review.hardFailures.length===0;
  return {pass,review,file:design?.strictSource||null};
}

function bindRequiredWebStage(item,{gameId,stamp}){
  const webSourcePath=webSourcePathOf(gameId);
  item.webSourcePath=webSourcePath;
  item.webValidationRequired=true;
  item.musicValidationRequired=true;
  item.homepageTestCandidate=false;
  item.homepageTestScore=null;
  item.homepageTestVerdict='WAITING_WEB_STRICT_REVIEW';
  item.status='ACTIVE';
  item.sourcePath=webSourcePath;
  item.currentStep='WEB_PLAYABLE_BOOTSTRAP';
  item.canonicalState='WAITING_WEB_GAMEPLAY_VALIDATION';
  item.webValidationQueuedAt=item.webValidationQueuedAt||stamp;
  item.postPromotionArtbookRequired=false;
  item.postWebArtbookRequired=true;
  item.artbookTiming='AFTER_WEB_STRICT_REVIEW_AT_80_OR_HIGHER';
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
    const design=latestReadyDesign(root,gameId);
    if(!design){skipped.push({gameId,reason:'DESIGN_BASELINE_NOT_READY'});continue;}
    const strict=strictDesignPass(design);
    if(!strict.pass){
      seed.strictDesignReview={verdict:strict.review?.verdict||'MISSING',totalScore:Number(strict.review?.totalScore||0),hardFailures:Array.isArray(strict.review?.hardFailures)?strict.review.hardFailures:[],evidencePath:strict.file,passThreshold:DESIGN_PASS_THRESHOLD};
      seed.lifecycleState=String(strict.review?.verdict||'REVISE').toUpperCase()==='REBUILD'?'DESIGN_REBUILD_REQUIRED':'DESIGN_REVISION_REQUIRED';
      skipped.push({gameId,reason:'STRICT_DESIGN_REVIEW_NOT_PASS',verdict:seed.strictDesignReview.verdict,totalScore:seed.strictDesignReview.totalScore});
      continue;
    }
    const selectedPlatform=selectedPlatformOf(seed);
    const targetSourcePath=targetSourcePathOf(gameId,selectedPlatform);
    const webSourcePath=webSourcePathOf(gameId);
    const artbookSource=`artbook-submissions/${gameId}/current.json`;

    seed.productionClass='DEVELOPMENT_CONFIRMED';
    seed.productionTier=2;
    seed.productionClassSource='DESIGN_BASELINE_READY_STRICT_PASS';
    seed.lifecycleState='DEVELOPMENT_CONFIRMED';
    seed.selectedPlatform=selectedPlatform;
    seed.strictDesignReview={verdict:'PASS',totalScore:Number(strict.review.totalScore),hardFailures:[],evidencePath:strict.file,passThreshold:DESIGN_PASS_THRESHOLD,excellent:Number(strict.review.totalScore)>=EXCELLENT_THRESHOLD};
    seed.promotion={
      from:'DESIGN_ONLY',to:'DEVELOPMENT_CONFIRMED',reason:'DESIGN_BASELINE_READY_STRICT_PASS',
      selectedPlatform,targetSourcePath,webSourcePath,
      requiredFirstValidation:'WEB_GAMEPLAY_MUSIC_AND_STRICT_REVIEW',
      designBaselineSource:design.designSource,
      designDate:design.date,
      artbookSource,
      artbookTiming:'AFTER_WEB_STRICT_REVIEW_AT_80_OR_HIGHER',
      postPromotionArtbookRequired:false,
      postWebArtbookRequired:true,
      strictDesignReviewSource:strict.file,
      strictDesignScore:Number(strict.review.totalScore),
      excellentDesign:Number(strict.review.totalScore)>=EXCELLENT_THRESHOLD,
      promotedAt:seed?.promotion?.promotedAt||stamp,
    };

    let project=portfolio.projects.find(row=>row?.slug===gameId);
    if(!project){
      project={id:`SEED-${seed.seedId||gameId}`,slug:gameId,name:seed.gameName||gameId,sourcePath:webSourcePath,webArchivePath:webSourcePath,protectedValues:['core-loop','design-baseline','save-meaning'],developmentFocus:{scores:{playability:0,distinctiveness:0,developmentEfficiency:0,scalability:0,lowBlockage:0},total:0,evidenceNote:'승격 직후. Web 실검증과 80점 이상 강심사 후 아트북/홈페이지 테스트 등록, 90점 이상에서 선택 플랫폼 진행.'}};
      portfolio.projects.push(project);
    }
    Object.assign(project,{
      productionClass:'DEVELOPMENT_CONFIRMED',productionClassSource:'DESIGN_BASELINE_READY_STRICT_PASS',profileStatus:'DEVELOPMENT_CONFIRMED',
      mode:'WEB_VALIDATION_THEN_POST_WEB_ARTBOOK_THEN_SELECTED_PLATFORM_IMPLEMENTATION',productionTier:2,productionTierSource:'DISPLAY_ALIAS_FROM_PRODUCTION_CLASS',
      targetEngine:selectedPlatform,selectedPlatform,targetPlatform:selectedPlatform,targetSourcePath,
      sourcePath:webSourcePath,
      webArchivePath:project.webArchivePath||webSourcePath,webValidationRequired:true,musicValidationRequired:true,
      strictDesignScore:Number(strict.review.totalScore),designBaselineSource:design.designSource,designArtbookSource:artbookSource,artbookTiming:'AFTER_WEB_STRICT_REVIEW_AT_80_OR_HIGHER',
    });

    let game=catalog.games.find(row=>row?.id===gameId);
    if(!game){
      game={id:gameId,name:seed.gameName||gameId,description:'개발확정 · Strict Design PASS',genre:[String(seed.GAME_CATEGORY||'').replaceAll('_',' ')],image:'',webPath:`/${webSourcePath}/`,hasWebArchive:false,featured:false};
      catalog.games.push(game);
    }
    Object.assign(game,{
      homepageCategory:'development-confirmed',productionClass:'DEVELOPMENT_CONFIRMED',productionClassSource:'DESIGN_BASELINE_READY_STRICT_PASS',
      productionTier:2,productionTierSource:'DISPLAY_ALIAS_FROM_PRODUCTION_CLASS',selectedPlatform,targetPlatform:selectedPlatform,targetSourcePath,productionTarget:selectedPlatform,
      strictDesignScore:Number(strict.review.totalScore),excellentDesign:Number(strict.review.totalScore)>=EXCELLENT_THRESHOLD,homepageOfficialCard:false,homepageTestCandidate:false,homepageTestScore:null,homepageReviewState:'WAITING_WEB_STRICT_REVIEW',
      homepageStage:'개발확정 · Web 제작/강심사 준비',homepageRecentWork:`Strict Design ${Number(strict.review.totalScore)}점 PASS · Web 제작/실플레이 강심사 대기 · 80점부터 홈피 테스트 후보`,homepageWebPlayable:false,
    });
    delete game.homepageArtbookPath;

    let item=queue.items.find(row=>row?.gameId===gameId);
    if(!item){
      item={gameId,seedId:seed.seedId||null,gameName:seed.gameName||gameId,productionClass:'DEVELOPMENT_CONFIRMED',selectedPlatform,targetPlatform:selectedPlatform,targetSourcePath,webSourcePath,designBaselineSource:design.designSource,designDate:design.date,artbookSource,artbookTiming:'AFTER_WEB_STRICT_REVIEW_AT_80_OR_HIGHER',postPromotionArtbookRequired:false,postWebArtbookRequired:true,strictDesignScore:Number(strict.review.totalScore),enqueuedAt:stamp};
      queue.items.push(item);
    }else{
      item.productionClass='DEVELOPMENT_CONFIRMED';item.selectedPlatform=selectedPlatform;item.targetPlatform=selectedPlatform;item.targetSourcePath=targetSourcePath;item.webSourcePath=item.webSourcePath||webSourcePath;item.designBaselineSource=design.designSource;item.designDate=design.date;item.artbookSource=artbookSource;item.artbookTiming='AFTER_WEB_STRICT_REVIEW_AT_80_OR_HIGHER';item.postPromotionArtbookRequired=false;item.postWebArtbookRequired=true;item.strictDesignScore=Number(strict.review.totalScore);
    }
    bindRequiredWebStage(item,{gameId,stamp});
    promoted.push(gameId);
  }

  state.updatedAt=stamp;queue.updatedAt=stamp;queue.webValidationPolicy='REQUIRED_WEB_STRICT_REVIEW_BEFORE_POST_WEB_ARTBOOK_AND_TARGET_PLATFORM';
  writeJson(seedPath,state);writeJson(portfolioPath,portfolio);writeJson(catalogPath,catalog);writeJson(queuePath,queue);
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
