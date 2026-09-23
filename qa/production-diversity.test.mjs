// 파일명: qa/production-diversity.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { applyHomepageRuntimeInfo, gameplayFamily, selectDiverseTopRows, syncProductionClasses } from '../tools/company-status-sync.mjs';
import { productionClassOf } from '../tools/production-classification.mjs';

const fsStub={existsSync:()=>true};
const project=(id,slug,total,productionClass)=>({id,slug,name:slug,sourcePath:`web-games/${slug}`,productionClass,profileStatus:productionClass,mode:productionClass==='DESIGN_ONLY'?'REDESIGN':'IMPROVE',developmentFocus:{total}});
const game=(id,genre,productionClass)=>({id,name:id,genre,productionClass,releasePublished:productionClass==='RELEASE_CONFIRMED',homepageWebPlayable:true,hasWebArchive:true,webPath:`/web-games/${id}/`});

function fixture(){
  const assignments=[
    ['P1','survival-a',9,'RELEASE_CONFIRMED',['생존','제작']],
    ['P2','rpg-a',8,'RELEASE_CONFIRMED',['RPG','탐험']],
    ['P3','survival-b',8,'RELEASE_CONFIRMED',['생존','탐험']],
    ['P4','defense-a',7,'DEVELOPMENT_CONFIRMED',['웨이브','전략']],
    ['P5','defense-b',6,'DESIGN_ONLY',['디펜스','전략']],
    ['P6','monster-a',5,'DESIGN_ONLY',['몬스터','턴제','모험']],
    ['P7','collection-a',4,'DESIGN_ONLY',['수집','성장']],
  ];
  return {
    portfolio:{
      productionClassPolicy:{fixedCounts:false,countsDerivedFromMembership:true,portfolioDiversity:{enabled:true,maxFocusScoreGap:1}},
      developmentFocusPolicy:{maxFocusedGames:1},
      projects:assignments.map(([id,slug,total,productionClass])=>project(id,slug,total,productionClass)),
    },
    catalog:{games:assignments.map(([,slug,,productionClass,genre])=>game(slug,genre,productionClass))},
    artbooks:{artbooks:[]},
  };
}

test('gameplay family normalizes gameplay genres without game ID rules',()=>{
  assert.equal(gameplayFamily({genre:['웨이브','곤충']}),'DEFENSE');
  assert.equal(gameplayFamily({genre:['몬스터','턴제','모험']}),'TURN_BASED');
  assert.equal(gameplayFamily({genre:['생존','제작']}),'SURVIVAL');
  assert.equal(gameplayFamily({genre:['수집','성장']}),'COLLECTION');
});

test('status sync preserves semantic memberships without numeric tier state or fixed quotas',()=>{
  const {portfolio,catalog,artbooks}=fixture();
  const result=syncProductionClasses({portfolio,catalog,artbooks,filesystem:fsStub});
  assert.deepEqual(result.state.releaseConfirmedGameIds,['P1','P2','P3']);
  assert.deepEqual(result.state.developmentConfirmedGameIds,['P4']);
  assert.deepEqual(result.state.designOnlyGameIds,['P5','P6','P7']);
  assert.deepEqual(result.state.counts,{releaseConfirmed:3,developmentConfirmed:1,designOnly:3});
  assert.equal(result.state.fixedCounts,false);
  assert.equal(result.state.countsDerivedFromMembership,true);
  assert.equal(result.state.diversity.membershipInfluence,false);
  assert.equal(result.state.diversity.adjusted,false);
  assert.equal(portfolio.projects.find(row=>row.id==='P3').productionClass,'RELEASE_CONFIRMED');
  assert.equal(Object.hasOwn(portfolio.projects.find(row=>row.id==='P3'),'productionTier'),false);
  assert.equal(portfolio.projects.find(row=>row.id==='P6').productionClass,'DESIGN_ONLY');
  assert.equal(catalog.games.find(row=>row.id==='monster-a').homepageCategory,'design-only');
  assert.equal(Object.hasOwn(catalog.games.find(row=>row.id==='monster-a'),'productionTier'),false);
});

test('owner redesign reset outranks stale runtime project class until canonical promotion replaces the reset source',()=>{
  const staleProject={productionClass:'RELEASE_CONFIRMED',profileStatus:'RELEASE_CONFIRMED'};
  const resetGame={productionClass:'DESIGN_ONLY',productionClassSource:'OWNER_REDESIGN_RESET_2026-09-13',homepageCategory:'design-only'};
  assert.equal(productionClassOf(staleProject,resetGame),'DESIGN_ONLY');
  const allGamesReset={productionClass:'RELEASE_CONFIRMED',productionClassSource:'OWNER_ALL_GAMES_DESIGN_RESET_2026-09-17',homepageCategory:'release-confirmed'};
  assert.equal(productionClassOf(staleProject,allGamesReset),'DESIGN_ONLY');

  const portfolio={
    productionClassPolicy:{fixedCounts:false,countsDerivedFromMembership:true,portfolioDiversity:{enabled:true,maxFocusScoreGap:1}},
    developmentFocusPolicy:{maxFocusedGames:1},
    projects:[{id:'OLD',slug:'reset-me',name:'reset-me',sourcePath:'web-games/reset-me',productionClass:'RELEASE_CONFIRMED',profileStatus:'RELEASE_CONFIRMED',selectedPlatform:'UNITY',developmentFocus:{total:9}}],
  };
  const catalog={games:[{id:'reset-me',name:'reset-me',genre:['생존'],productionClass:'DESIGN_ONLY',productionClassSource:'OWNER_REDESIGN_RESET_2026-09-13',homepageCategory:'design-only',homepageWebPlayable:false,hasWebArchive:false}]};
  const result=syncProductionClasses({portfolio,catalog,artbooks:{artbooks:[]},filesystem:fsStub});
  assert.deepEqual(result.state.designOnlyGameIds,['OLD']);
  assert.equal(portfolio.projects[0].productionClass,'DESIGN_ONLY');
  assert.equal(portfolio.projects[0].targetEngine,'design-only');
  assert.equal(catalog.games[0].productionClass,'DESIGN_ONLY');
  assert.equal(catalog.games[0].homepageCategory,'design-only');

  const promotedGame={...resetGame,productionClass:'DEVELOPMENT_CONFIRMED',productionClassSource:'DESIGN_BASELINE_READY',homepageCategory:'development-confirmed'};
  assert.equal(productionClassOf({productionClass:'DEVELOPMENT_CONFIRMED'},promotedGame),'DEVELOPMENT_CONFIRMED');
});

test('runtime promotion survives stale main DESIGN_ONLY mirrors only with matching active seed and queue evidence',()=>{
  const portfolio={
    productionClassPolicy:{fixedCounts:false,countsDerivedFromMembership:true,portfolioDiversity:{enabled:true,maxFocusScoreGap:1}},
    developmentFocusPolicy:{maxFocusedGames:1},
    projects:[{id:'P',slug:'promoted',name:'promoted',sourcePath:'web-games/promoted',productionClass:'DESIGN_ONLY',productionClassSource:'OWNER_ALL_GAMES_DESIGN_RESET_2026-09-17',profileStatus:'HOLD_MISSING_SOURCE',mode:'HOLD',selectedPlatform:'UNITY',developmentFocus:{total:8}}],
  };
  const catalog={games:[{id:'promoted',name:'promoted',genre:['RPG'],productionClass:'DESIGN_ONLY',productionClassSource:'OWNER_ALL_GAMES_DESIGN_RESET_2026-09-17',homepageCategory:'design-only',selectedPlatform:'UNITY',homepageWebPlayable:true,hasWebArchive:true}]};
  const developmentQueue={items:[{gameId:'promoted',productionClass:'DEVELOPMENT_CONFIRMED',selectedPlatform:'UNITY',status:'ACTIVE'}]};
  const seedState={seeds:[{gameId:'promoted',status:'ACTIVE',productionClass:'DEVELOPMENT_CONFIRMED',selectedPlatform:'UNITY'}]};
  const result=syncProductionClasses({portfolio,catalog,artbooks:{artbooks:[]},developmentQueue:{items:[]},seedState,filesystem:fsStub});
  assert.deepEqual(result.state.developmentConfirmedGameIds,['P']);
  assert.equal(portfolio.projects[0].productionClass,'DEVELOPMENT_CONFIRMED');
  assert.equal(portfolio.projects[0].productionClassSource,'COMPANY_RUNTIME_PROMOTED_SEED');
  assert.equal(portfolio.projects[0].targetEngine,'roblox-unity-native');
  assert.equal(portfolio.projects[0].mode,'ROBLOX_UNITY_DIRECT_NATIVE_CONCURRENT');
  assert.deepEqual(portfolio.projects[0].concurrentTargetPlatforms,['ROBLOX','UNITY']);
  assert.equal(portfolio.projects[0].profileStatus,'DEVELOPMENT_CONFIRMED');
  assert.equal(catalog.games[0].productionClass,'DEVELOPMENT_CONFIRMED');
  assert.equal(catalog.games[0].productionClassSource,'COMPANY_RUNTIME_PROMOTED_SEED');
  assert.equal(catalog.games[0].homepageCategory,'development-confirmed');

  const withQueue=syncProductionClasses({portfolio,catalog,artbooks:{artbooks:[]},developmentQueue,seedState,filesystem:fsStub});
  assert.deepEqual(withQueue.state.developmentConfirmedGameIds,['P']);
  assert.equal(portfolio.projects[0].productionClassSource,'COMPANY_RUNTIME_DEVELOPMENT_QUEUE');
  assert.equal(catalog.games[0].productionClassSource,'COMPANY_RUNTIME_DEVELOPMENT_QUEUE');

  const resetAgain=syncProductionClasses({
    portfolio,
    catalog,
    artbooks:{artbooks:[]},
    developmentQueue,
    seedState:{seeds:[{gameId:'promoted',status:'ACTIVE',productionClass:'DESIGN_ONLY'}]},
    filesystem:fsStub
  });
  assert.deepEqual(resetAgain.state.designOnlyGameIds,['P']);
  assert.equal(portfolio.projects[0].productionClass,'DESIGN_ONLY');
});

test('runtime seed synthesizes a missing portfolio project instead of dropping promoted development',()=>{
  const portfolio={
    productionClassPolicy:{fixedCounts:false,countsDerivedFromMembership:true,portfolioDiversity:{enabled:true,maxFocusScoreGap:1}},
    developmentFocusPolicy:{maxFocusedGames:1},
    projects:[]
  };
  const catalog={games:[{id:'runtime-only',name:'Runtime Only',genre:['전략'],productionClass:'DESIGN_ONLY',productionClassSource:'OWNER_ALL_GAMES_DESIGN_RESET_2026-09-17',homepageCategory:'design-only',selectedPlatform:'UNITY',webPath:'/web-games/runtime-only/',homepageWebPlayable:true,hasWebArchive:true}]};
  const seedState={seeds:[{gameId:'runtime-only',gameName:'Runtime Only',status:'ACTIVE',productionClass:'DEVELOPMENT_CONFIRMED',productionClassSource:'DESIGN_BASELINE_READY_STRICT_PASS',selectedPlatform:'UNITY'}]};
  const developmentQueue={items:[{gameId:'runtime-only',productionClass:'DEVELOPMENT_CONFIRMED',selectedPlatform:'UNITY',status:'ACTIVE'}]};
  const result=syncProductionClasses({portfolio,catalog,artbooks:{artbooks:[]},developmentQueue,seedState,filesystem:fsStub});
  assert.equal(portfolio.projects.length,1);
  assert.equal(portfolio.projects[0].slug,'runtime-only');
  assert.equal(portfolio.projects[0].runtimeSynthesized,true);
  assert.equal(portfolio.projects[0].productionClass,'DEVELOPMENT_CONFIRMED');
  assert.equal(portfolio.projects[0].targetEngine,'roblox-unity-native');
  assert.deepEqual(portfolio.projects[0].concurrentTargetPlatforms,['ROBLOX','UNITY']);
  assert.equal(catalog.games[0].productionClass,'DEVELOPMENT_CONFIRMED');
  assert.equal(catalog.games[0].homepageCategory,'development-confirmed');
  assert.deepEqual(result.state.developmentConfirmedGameIds,['RUNTIME-runtime-only']);
});

test('release keeps owner-selected platform while DEVELOPMENT_CONFIRMED projects use concurrent Roblox and Unity native targets',()=>{
  const portfolio={
    productionClassPolicy:{fixedCounts:false,countsDerivedFromMembership:true,portfolioDiversity:{enabled:true,maxFocusScoreGap:1}},
    developmentFocusPolicy:{maxFocusedGames:1},
    projects:[
      {id:'R',slug:'r',sourcePath:'web-games/r',productionSourcePath:'roblox-games/r',productionClass:'RELEASE_CONFIRMED',selectedPlatform:'ROBLOX',developmentFocus:{total:8}},
      {id:'U',slug:'u',sourcePath:'web-games/u',productionSourcePath:'unity-games/u',productionClass:'RELEASE_CONFIRMED',selectedPlatform:'UNITY',unityProjectReady:true,developmentFocus:{total:9}},
      {id:'F',slug:'f',sourcePath:'web-games/f',productionSourcePath:'uefn-games/f',productionClass:'RELEASE_CONFIRMED',selectedPlatform:'FORTNITE_UEFN',developmentFocus:{total:7}},
      {id:'D',slug:'d',sourcePath:'web-games/d',productionClass:'DEVELOPMENT_CONFIRMED',developmentFocus:{total:6}},
    ],
  };
  const catalog={games:[
    {id:'r',productionClass:'RELEASE_CONFIRMED',selectedPlatform:'ROBLOX',releasePublished:true,homepageWebPlayable:true},
    {id:'u',productionClass:'RELEASE_CONFIRMED',selectedPlatform:'UNITY',releasePublished:true,homepageWebPlayable:true},
    {id:'f',productionClass:'RELEASE_CONFIRMED',selectedPlatform:'FORTNITE_UEFN',releasePublished:true,homepageWebPlayable:true},
    {id:'d',productionClass:'DEVELOPMENT_CONFIRMED',homepageWebPlayable:true},
  ]};
  const result=syncProductionClasses({portfolio,catalog,artbooks:{artbooks:[]},filesystem:fsStub});
  assert.equal(portfolio.projects.find(row=>row.id==='R').targetEngine,'roblox');
  assert.equal(portfolio.projects.find(row=>row.id==='U').targetEngine,'unity-android');
  assert.equal(portfolio.projects.find(row=>row.id==='F').targetEngine,'fortnite-uefn');
  const dev=portfolio.projects.find(row=>row.id==='D');
  assert.equal(dev.targetEngine,'roblox-unity-native');
  assert.equal(dev.mode,'ROBLOX_UNITY_DIRECT_NATIVE_CONCURRENT');
  assert.deepEqual(dev.concurrentTargetPlatforms,['ROBLOX','UNITY']);
  assert.equal(dev.approvedDesignScopeMustBeFullyImplemented,true);
  assert.equal(portfolio.productionClassPolicy.classes.RELEASE_CONFIRMED.engine,'PROJECT_SELECTED_PLATFORM');
  assert.equal(portfolio.productionClassPolicy.classes.DEVELOPMENT_CONFIRMED.engine,'ROBLOX_UNITY_DIRECT_NATIVE');
  assert.deepEqual(portfolio.productionClassPolicy.classes.DEVELOPMENT_CONFIRMED.concurrentTargetPlatforms,['ROBLOX','UNITY']);
  assert.equal(portfolio.productionClassPolicy.classes.DEVELOPMENT_CONFIRMED.admissionAuthority,'MINIMUM_DUAL_PLATFORM_DESIGN_READY');
  assert.equal(portfolio.productionClassPolicy.classes.DEVELOPMENT_CONFIRMED.targetPlatformMayRunImmediately,true);
  assert.equal(portfolio.productionClassPolicy.classes.DEVELOPMENT_CONFIRMED.strictDesignScoreRequiredForAdmission,false);
  assert.equal(portfolio.productionClassPolicy.classes.DEVELOPMENT_CONFIRMED.strictDesignReviewRunsInParallel,true);
  assert.equal(portfolio.productionClassPolicy.classes.DEVELOPMENT_CONFIRMED.approvedDesignScopeMustBeFullyImplemented,true);
  assert.equal(Object.hasOwn(portfolio.developmentFocusPolicy,'developmentConfirmedWebPrototypeAllowedAlongsideReleaseFocus'),false);
  assert.equal(Object.hasOwn(portfolio.developmentFocusPolicy,'optionalWebGameplayTestbedAllowedAlongsideReleaseFocus'),false);
  assert.equal(Object.hasOwn(portfolio.developmentFocusPolicy,'requiredWebGameplayAndMusicValidationBeforeTargetPlatform'),false);
  assert.equal(portfolio.developmentFocusPolicy.nativeDevelopmentAdmission,'MINIMUM_DUAL_PLATFORM_DESIGN_READY');
  assert.equal(Object.hasOwn(dev,'webPurpose'),false);
  assert.equal(Object.hasOwn(dev,'webCompanionRequired'),false);
  assert.equal(Object.hasOwn(dev,'webGameplayValidationRequired'),false);
  assert.equal(portfolio.developmentFocusPolicy.nativePlatformEvidenceStillRequired,true);
  assert.equal((result.state.ranking||[]).some(row=>Object.hasOwn(row,'unityReady')),false);
});

test('diversity selector remains diagnostic-only and does not control membership',()=>{
  const rows=[
    {project:{id:'A'},gameplayFamily:'SURVIVAL',score:9,evidenceScore:900},
    {project:{id:'B'},gameplayFamily:'RPG',score:8,evidenceScore:800},
    {project:{id:'C'},gameplayFamily:'SURVIVAL',score:8,evidenceScore:790},
    {project:{id:'D'},gameplayFamily:'DEFENSE',score:7,evidenceScore:700},
    {project:{id:'E'},gameplayFamily:'DEFENSE',score:6,evidenceScore:600},
    {project:{id:'F'},gameplayFamily:'COLLECTION',score:4,evidenceScore:400},
  ];
  const selected=selectDiverseTopRows(rows,5,{enabled:true,maxFocusScoreGap:1});
  assert.deepEqual(selected.map(row=>row.project.id),['A','B','D','C','E']);
});


test('homepage runtime info exposes direct-native platform state without reviving legacy Web scores',()=>{
  const catalog={updatedAt:'2026-09-18',games:[
    {id:'dev',name:'Dev',genre:['디펜스'],productionClass:'DEVELOPMENT_CONFIRMED',lifecycleState:'ACTIVE',selectedPlatform:'UNITY'},
    {id:'design',name:'Design',genre:['RPG'],productionClass:'DESIGN_ONLY',lifecycleState:'ACTIVE',selectedPlatform:'ROBLOX'}
  ]};
  const developmentQueue={items:[{
    gameId:'dev',status:'ACTIVE',canonicalState:'WEB_INITIAL_CYCLE_PASS',selectedPlatform:'UNITY',
    webInitialCyclePassed:true,webInitialCycleStrictScore:88,webInitialCycleValidationSchemaVersion:15,
    webInitialCycleMusicValidationPassed:true,webSourceIndexSha256:'source-a',webInitialCycleSourceIndexSha256:'source-a',
    webDesignBaselineSha256:'baseline-a',webInitialCycleDesignBaselineSha256:'baseline-a',updatedAt:'2026-09-18T14:00:00Z'
  }]};
  const seedState={seeds:[{
    gameId:'design',status:'ACTIVE',INITIAL_TARGET_PLATFORM:'ROBLOX',MULTIPLAYER_DESIGN_MODE:'COOP',
    ROBLOX_GENRE_LABEL_KO:'RPG',ROBLOX_SUBGENRE_LABEL_KO:'탐험'
  }]};

  applyHomepageRuntimeInfo({catalog,developmentQueue,seedState});
  assert.equal(catalog.runtimeAuthority,'company-runtime');
  assert.equal(catalog.runtimeInfoAuthority,'company-runtime');
  assert.deepEqual(catalog.runtimeSupportedPlatforms,['ROBLOX','UNITY']);
  assert.equal(catalog.runtimeCounts.homepageInfo,2);

  const dev=catalog.games.find(row=>row.id==='dev').homepageInfo;
  assert.equal(dev.score,null);
  assert.equal(dev.scoreCurrent,false);
  assert.equal(dev.scoreSource,'DISABLED_FOR_DIRECT_NATIVE_DEVELOPMENT');
  assert.equal(dev.validationSchemaVersion,null);
  assert.equal(dev.productionClass,'DEVELOPMENT_CONFIRMED');

  const design=catalog.games.find(row=>row.id==='design').homepageInfo;
  assert.equal(design.score,null);
  assert.equal(design.platform,'ROBLOX');
  assert.equal(design.genreLabel,'RPG · 탐험');
  assert.equal(design.playModeLabel,'협동');

  developmentQueue.items[0].webSourceIndexSha256='source-b';
  applyHomepageRuntimeInfo({catalog,developmentQueue,seedState});
  const stale=catalog.games.find(row=>row.id==='dev').homepageInfo;
  assert.equal(stale.score,null);
  assert.equal(stale.scoreCurrent,false);
  assert.equal(stale.scoreLabel,'점수 미평가');
});
