import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  runCompanyStatusSync,
  synchronizeCompanyStatusPolicy,
  syncProductionClasses,
  applyHomepageRuntimeInfo,
} from '../tools/company-status-sync.mjs';

// 카탈로그 자동 분류와 동기화 검사는 검증된 중앙정책을 같은 단계에서 사용한다.
const statusSyncWorkflow=fs.readFileSync('.github/workflows/company-status-sync.yml','utf8');
assert.match(statusSyncWorkflow,/name: Sync company status and semantic production classes\n\s*env:\n\s*COMPANY_VERIFIED_POLICY_PATH: company-learning\/platform-release-roadmap\.json/);

const machinePolicy={
  authority:'MACHINE_EXECUTION_CONTRACT',
  machineSourceOfTruth:'company-learning/platform-release-roadmap.json',
  humanDocumentRequired:false,
  developmentLifecycleMachine:{
    stages:[
      'MINIMUM_DESIGN_CONTRACT_READY',
      'ROBLOX_UNITY_NATIVE_SOURCE_BIND',
      'TARGET_PLATFORM_RUNTIME',
      'TARGET_PLATFORM_INDEPENDENT_QA',
      'TARGET_PLATFORM_REGRESSION',
      'INTERNAL_PLATFORM_RELEASE',
      'INTERNAL_PLATFORM_PLAYTEST_AND_DEBUG',
      'PUBLIC_RELEASE_READY',
      'PUBLIC_RELEASE',
      'POST_RELEASE_FOCUSED_DEVELOPMENT'
    ]
  },
  directNativeDualPlatformDevelopment:{
    status:'OWNER_DIRECT_LOCKED',
    mode:'ROBLOX_UNITY_APP_BIDIRECTIONAL_AUTO_PAIR',
    canonicalDevelopmentAdmissionAuthority:true,
    strictDesignScoreRequiredForDevelopmentAdmission:false,
    legacyWebFirstFallbackForbidden:true,
    supportedDevelopmentPlatforms:['ROBLOX','UNITY']
  }
};
const fsStub={
  existsSync(file){
    return file==='company-learning/platform-release-roadmap.json'
      || file==='roblox-games/g1'
      || file==='unity-games/g1';
  },
  readFileSync(file){
    if(file==='company-learning/platform-release-roadmap.json')return JSON.stringify(machinePolicy);
    throw new Error('unexpected read '+file);
  }
};

test('company status policy mirrors direct-native admission without Web-first authority',()=>{
  const company={policy:{
    webCompanionRequiredForEveryGame:true,
    webGameplayValidationRequired:true,
    musicValidationRequired:true,
    webBeforeTargetPlatformByDefault:true
  }};
  const policy=synchronizeCompanyStatusPolicy(company,{filesystem:fsStub});
  assert.deepEqual(policy.allowedTargetPlatforms,['ROBLOX','UNITY']);
  assert.deepEqual(policy.concurrentTargetPlatforms,['ROBLOX','UNITY']);
  assert.equal(policy.developmentAdmission,'MINIMUM_DUAL_PLATFORM_DESIGN_READY');
  assert.equal(policy.strictDesignScoreRequiredForAdmission,false);
  assert.equal(policy.strictDesignReviewRunsInParallel,true);
  assert.equal(policy.targetPlatformMayRunImmediately,true);
  assert.equal(policy.unityWebValidationPolicySource,'company-learning/platform-release-roadmap.json#directNativeDualPlatformDevelopment.unityWebValidationSurface');
  for(const key of ['webPurpose','webCompanionRequiredForEveryGame','webGameplayValidationRequired','musicValidationRequired','webBeforeTargetPlatformByDefault','unityWebValidationGateAuthority'])assert.equal(Object.hasOwn(policy,key),false,key);
  assert.equal(policy.fortniteUefnAutomaticDevelopment,false);
});

test('DEVELOPMENT_CONFIRMED projection is one Roblox plus Unity native state',()=>{
  const portfolio={
    version:1,
    projects:[{
      id:'P1',slug:'g1',name:'Game One',
      sourcePath:'roblox-games/g1',
      selectedPlatform:'ROBLOX',
      productionClass:'DEVELOPMENT_CONFIRMED',
      profileStatus:'DEVELOPMENT_CONFIRMED',
      developmentFocus:{total:10}
    }]
  };
  const catalog={version:1,games:[{
    id:'g1',name:'Game One',genre:['rpg'],lifecycleState:'ACTIVE',
    productionClass:'DEVELOPMENT_CONFIRMED',selectedPlatform:'ROBLOX'
  }]};
  const queue={items:[{
    gameId:'g1',productionClass:'DEVELOPMENT_CONFIRMED',
    selectedPlatform:'ROBLOX',status:'ACTIVE'
  }]};
  const seedState={seeds:[{
    gameId:'g1',status:'ACTIVE',productionClass:'DEVELOPMENT_CONFIRMED',
    selectedPlatform:'ROBLOX'
  }]};

  const result=syncProductionClasses({
    portfolio,catalog,artbooks:{artbooks:[],dailySubmissions:[]},
    developmentQueue:queue,seedState,filesystem:fsStub
  });
  const project=result.portfolio.projects[0];
  const game=result.catalog.games[0];
  const policy=result.portfolio.productionClassPolicy.classes.DEVELOPMENT_CONFIRMED;

  assert.equal(project.mode,'ROBLOX_UNITY_DIRECT_NATIVE_CONCURRENT');
  assert.equal(project.targetEngine,'roblox-unity-native');
  assert.deepEqual(project.concurrentTargetPlatforms,['ROBLOX','UNITY']);
  assert.equal(project.targetSourcePaths.ROBLOX,'roblox-games/g1');
  assert.equal(project.targetSourcePaths.UNITY,'unity-games/g1');
  for(const key of ['webPurpose','webCompanionRequired','webValidationRequired','webGameplayValidationRequired','musicValidationRequired','webEvidenceMayReplaceNativePlatformEvidence','webBeforeTargetPlatformByDefault'])assert.equal(Object.hasOwn(project,key),false,key);
  assert.equal(project.strictDesignScoreRequiredForAdmission,false);
  assert.equal(project.strictDesignReviewRunsInParallel,true);

  assert.equal(game.productionTarget,'ROBLOX_UNITY');
  assert.deepEqual(game.concurrentTargetPlatforms,['ROBLOX','UNITY']);
  assert.equal(game.homepageStage,'개발확정 · Roblox + Unity 앱 동시개발');

  assert.equal(policy.engine,'ROBLOX_UNITY_DIRECT_NATIVE');
  assert.equal(policy.admissionAuthority,'MINIMUM_DUAL_PLATFORM_DESIGN_READY');
  assert.equal(Object.hasOwn(policy,'webCompanionRequired'),false);
  assert.equal(policy.targetPlatformMayRunImmediately,true);
  assert.equal(result.portfolio.productionClassState.pipeline.activeDevelopmentWipMax,null);
  assert.equal(result.portfolio.productionClassState.pipeline.noArtificialGlobalGameCountCap,true);
});

test('homepage runtime ignores legacy Web implementation scores for direct-native development',()=>{
  const catalog={version:1,games:[{
    id:'g1',name:'Game One',genre:['rpg'],lifecycleState:'ACTIVE',
    productionClass:'DEVELOPMENT_CONFIRMED',selectedPlatform:'ROBLOX'
  }]};
  applyHomepageRuntimeInfo({
    catalog,
    developmentQueue:{items:[{
      gameId:'g1',productionClass:'DEVELOPMENT_CONFIRMED',selectedPlatform:'ROBLOX',
      webInitialCyclePassed:true,webInitialCycleStrictScore:99,
      webInitialCycleMusicValidationPassed:true,webInitialCycleValidationSchemaVersion:999,
      canonicalState:'TARGET_PLATFORM_RUNTIME'
    }]},
    seedState:{seeds:[{gameId:'g1',status:'ACTIVE',productionClass:'DEVELOPMENT_CONFIRMED',selectedPlatform:'ROBLOX'}]}
  });
  assert.deepEqual(catalog.runtimeSupportedPlatforms,['ROBLOX','UNITY']);
  assert.equal(catalog.games[0].homepageInfo.score,null);
  assert.equal(catalog.games[0].homepageInfo.scoreCurrent,false);
  assert.equal(catalog.games[0].homepageInfo.scoreSource,'DISABLED_FOR_DIRECT_NATIVE_DEVELOPMENT');
  assert.equal(catalog.games[0].homepageInfo.validationSchemaVersion,null);
});


test('catalog-only DEVELOPMENT_CONFIRMED game keeps canonical direct-native homepage state',()=>{
  const portfolio={version:1,projects:[]};
  const catalog={version:1,games:[{
    id:'catalog-only',name:'Catalog Only',genre:['simulation'],lifecycleState:'ACTIVE',
    productionClass:'DEVELOPMENT_CONFIRMED',productionClassSource:'OWNER_DIRECT_GAME_BUILD',
    selectedPlatform:'ROBLOX',productionTarget:'roblox',
    homepageStage:'개발확정 · Web 검증 → Roblox'
  }]};

  const result=syncProductionClasses({
    portfolio,catalog,artbooks:{artbooks:[],dailySubmissions:[]},
    developmentQueue:{items:[]},seedState:{seeds:[]},filesystem:fsStub
  });
  const game=result.catalog.games[0];

  assert.equal(result.portfolio.projects.length,0,'catalog-only owner game must not create an artificial portfolio project');
  assert.equal(game.productionClass,'DEVELOPMENT_CONFIRMED');
  assert.equal(game.productionClassSource,'OWNER_DIRECT_GAME_BUILD');
  assert.equal(game.selectedPlatform,'ROBLOX');
  assert.equal(game.productionTarget,'ROBLOX_UNITY');
  assert.deepEqual(game.concurrentTargetPlatforms,['ROBLOX','UNITY']);
  assert.equal(game.homepageStage,'개발확정 · Roblox + Unity 앱 동시개발');
});

// Exercise the actual homepage projection, including catalog-only focus games.
test('owner focus tracks exactly one Roblox game and two Web games in homepage status',()=>{
  const writes=new Map();
  const filesystem={...fs,writeFileSync:(file,value)=>writes.set(file,value)};
  const {company}=runCompanyStatusSync({filesystem});
  const focus=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8')).developmentLifecycleMachine.focusedDevelopmentCaretakers;
  assert.equal(company.operations.autonomousFocus.enabled,true);
  assert.equal(company.operations.autonomousFocus.targetSlots,3);
  assert.equal(company.operations.autonomousFocus.filledSlots,3);
  assert.deepEqual(company.operations.autonomousFocus.focusedGameIds,focus.ownerFocusedGameIds);
  assert.deepEqual(company.operations.autonomousFocus.games.map(game=>game.gameId),focus.ownerFocusedGameIds);
  const expected=focus.ownerFocusedGameIds.map(gameId=>[gameId,focus.ownerFocusedGamePlatforms[gameId]]);
  assert.deepEqual(company.operations.autonomousFocus.games.map(game=>[game.gameId,game.selectedPlatform]),expected);
  assert.deepEqual(expected,[
    ['simple-rpg','ROBLOX'],['fantasy-survival','WEB'],['cozy-island','WEB']
  ]);
  for(const game of company.operations.autonomousFocus.games.filter(game=>game.selectedPlatform==='WEB')){
    assert.ok(fs.existsSync(`web-games/${game.slug}/index.html`),`missing Web source: ${game.slug}`);
    assert.equal(game.targetPlatformReady,true,`Web source readiness missing: ${game.slug}`);
  }
  assert.ok(company.operations.autonomousFocus.source.includes('company-learning/platform-release-roadmap.json'));
  assert.ok(writes.has('company-status.json'));
});
