import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {applyHomepageRuntimeInfo,mergeRuntimeCatalogMissingGames} from '../tools/company-status-sync.mjs';
import {buildHomepagePlatformExposure,verifiedCompletionHistory} from '../tools/company-homepage-platform-exposure-sync.mjs';

// 최신 설계 요약은 기존 게임의 이름·설명·세이브용 카탈로그 identity를 덮어쓰지 않는다.
test('검증된 설계 요약은 홈페이지 전용으로 표시하고 원본 게임 identity는 보존한다',()=>{
  const id='homepage-summary-game';
  const path='design/homepage-summary-game/2026-10-10/design-revised.json';
  const original='기존 게임 설명과 식별 정보는 보존해야 한다.';
  const summary='빛나는 숲을 탐험하고 유적을 회복하는 입체 모험 게임.';
  const catalog={games:[{
    id,name:'숲속 모험',description:original,productionClass:'DEVELOPMENT_CONFIRMED',
    lifecycleState:'ACTIVE'
  }]};
  const developmentQueue={items:[{gameId:id,designBaselineSource:path,minimumDesignContract:{source:path}}]};
  const designBaselines={[id]:{source:path,value:{gameId:id,content:{identity:summary}}}};
  applyHomepageRuntimeInfo({catalog,developmentQueue,designBaselines});
  const game=catalog.games[0];
  assert.equal(game.description,original);
  assert.equal(game.canonical.identity.description,original);
  assert.equal(game.homepageDesignSource,path);
  assert.equal(game.homepageDesignSummary,summary);
  const source=fs.readFileSync('assets/homepage-enhancements.js','utf8');
  const renderer=vm.runInNewContext(source+';mergeGame', {
    document:{readyState:'loading',addEventListener(){}}
  });
  assert.equal(renderer(game).description,summary);

  // 원본 검증이 없어지면 이전 설계 요약을 그대로 재사용하지 않는다.
  applyHomepageRuntimeInfo({catalog,developmentQueue,designBaselines:{}});
  assert.equal(game.homepageDesignSummary,undefined);
  assert.equal(game.homepageDesignSource,undefined);
  assert.equal(renderer(game).description,original);
});

test('실제 Unity WebGL을 개발자가 QA 수리 중에도 직접 테스트하고 옛 게임 주소는 유지한다',async()=>{
  const source=fs.readFileSync('assets/homepage-enhancements.js','utf8');
  const fetched=[];
  let previewMode=false,invalid3d=false,invalidVisual=false,missingWasm=false,mismatchedBuild=false,legacyRootHeld=false;
  const group={loader:['Build/demo.loader.js'],data:['Build/demo.data'],framework:['Build/demo.framework.js'],wasm:['Build/demo.wasm']};
  const evidence=()=>({
    engine:'UNITY_WEB',gameId:'demo',pass:legacyRootHeld||!previewMode,playableBrowserTest:true,
    boot:{pass:true},input:{pass:true},gameplay:{pass:true},coreFun:{pass:true},saveRestore:{pass:true},
    mobile:{pass:true,actualBrowserTouchDispatched:true,realGameTouchHandlerObserved:true},
    noCriticalRuntimeError:true,performance:{pass:legacyRootHeld||!previewMode},
    spatialGameplay:{pass:!invalid3d,requiredDimension:'3D',
      source:'UNITY_RUNTIME_MESH_FILTER_TRIANGLE_AND_3AXIS_WORLD_DEPTH_PROOF',
      depthPass:true,perspectiveCamera:true,
      observedMeshCount:3,observedTriangles:500,worldMeshes3d:2,worldDepthCm:70,
      gameplayActors3d:1,spriteGameplayActors:0},
    visualQa:{pass:!invalidVisual,nativeUnityMesh:{pass:!invalid3d,measurementState:'UNITY_RUNTIME_MESH_INSPECTION'}}
  });
  const engine=vm.runInNewContext(source+';({setExposure(value){platformExposure=value},bindAvailableUnityWebSurfaces})',{
    document:{readyState:'loading',addEventListener(){}},
    AbortController,setTimeout,clearTimeout,
    fetch:async(url,options={})=>{
      const location=String(url);
      fetched.push(location);
      const preview=location.includes('/unity/');
      if(location.includes('index.html'))return{ok:preview===previewMode,
        text:async()=>'<script src="Build/demo.loader.js"></script><script>createUnityInstance(canvas,{})</script>'};
      if(preview!==previewMode)return{ok:false};
      if(location.includes('unity-web-deploy-manifest.json'))return{ok:true,json:async()=>({
        engine:'UNITY_WEB',gameId:'demo',bundleComplete:true,requiredGroups:group,
        canonicalSourceRoot:'unity-games/demo',requiredDimension:'3D',
        sourceCommit:'a'.repeat(40),buildTreeSha256:'b'.repeat(64),unitySourceTreeSha256:'c'.repeat(64),
        homepageVerified:!previewMode||legacyRootHeld,ownerPlayableVerified:true
      })};
      if(location.includes('unity-web-build.json'))return{ok:true,json:async()=>({
        engine:'UNITY_WEB',gameId:'demo',bootSmoke:'PASS',ownerBrowserTestEligible:true,
        upperPlatformGateCandidate:legacyRootHeld||!previewMode,
        sourceCommit:'a'.repeat(40),buildTreeSha256:'b'.repeat(64),unitySourceTreeSha256:'c'.repeat(64),
        canonicalSourceRoot:'unity-games/demo',buildOutputRoot:'web-games/demo',legacyRootPreservedForSave:legacyRootHeld,
        actualBrowserPlay:previewMode?'PLAYABLE_TEST_ONLY':'PASS'
      })};
      if(location.includes('unity-web-gameplay-validation.json'))return{ok:true,json:async()=>evidence()};
      if(location.includes('unity-web-independent-qa.json'))return{ok:true,json:async()=>evidence()};
      if(location.includes('unity-web-regression.json'))return{ok:true,json:async()=>evidence()};
      if(location.includes('upper-platform-development-readiness.json'))return{ok:true,json:async()=>({
        gameId:'demo',state:legacyRootHeld||!previewMode?'UPPER_PLATFORM_DEVELOPMENT_READY':'REPAIR_REQUIRED',pass:legacyRootHeld||!previewMode,
        sourceCommit:'a'.repeat(40),buildTreeSha256:(mismatchedBuild?'f':'b').repeat(64),unitySourceTreeSha256:'c'.repeat(64),
        criteria:{graphics:{native3dVerified:true},qa:{pass:true,multiplayerPass:true}}
      })};
      return{ok:options.method==='HEAD'&&(!missingWasm||!location.includes('demo.wasm'))};
    }
  });
  engine.setExposure({unityWebEnabled:true,games:[]});
  const catalog={games:[{id:'demo',productionClass:'DEVELOPMENT_CONFIRMED',
    canonical:{sources:{unity:{projectPath:'unity-games/demo'}},production:{class:'DEVELOPMENT_CONFIRMED'}}}]};
  const ready=await engine.bindAvailableUnityWebSurfaces(catalog);
  assert.equal(ready.games[0].unityWebTestUrl,'/web-games/demo/');
  assert.equal(ready.games[0].unityWebTestOnly,false);
  assert.equal(fetched.filter(url=>url.includes('/Build/demo.')).length,4);
  previewMode=true;
  const preview=await engine.bindAvailableUnityWebSurfaces(catalog);
  assert.equal(preview.games[0].unityWebAvailable,true);
  assert.equal(preview.games[0].unityWebTestUrl,'/web-games/demo/unity/');
  assert.equal(preview.games[0].unityWebTestOnly,true,'a playable test is not final QA PASS');
  invalid3d=true;
  const blocked=await engine.bindAvailableUnityWebSurfaces(catalog);
  assert.equal(blocked.games[0].unityWebAvailable,false,'2D and missing native mesh cannot count as an owner test');
  invalid3d=false;
  invalidVisual=true;
  const brokenScreen=await engine.bindAvailableUnityWebSurfaces(catalog);
  assert.equal(brokenScreen.games[0].unityWebAvailable,false,'real browser visual QA failure blocks owner test link');
  invalidVisual=false;
  missingWasm=true;
  const noBundle=await engine.bindAvailableUnityWebSurfaces(catalog);
  assert.equal(noBundle.games[0].unityWebAvailable,false,'missing actual WebGL runtime assets blocks the test link');
  missingWasm=false;
  mismatchedBuild=true;
  const staleEvidence=await engine.bindAvailableUnityWebSurfaces(catalog);
  assert.equal(staleEvidence.games[0].unityWebAvailable,false,'QA from a different WebGL build cannot unlock a gameplay link');
  mismatchedBuild=false;
  legacyRootHeld=true;
  const protectedLegacy=await engine.bindAvailableUnityWebSurfaces(catalog);
  assert.equal(protectedLegacy.games[0].unityWebTestUrl,'/web-games/demo/unity/');
  assert.equal(protectedLegacy.games[0].unityWebTestOnly,true,'legacy save migration keeps even QA-ready builds in the test route');
});

test('개발 확정 전체 목록은 배포 없는 게임도 보이되 플랫폼 버튼은 활성화하지 않는다',()=>{
  const renderer=fs.readFileSync('assets/homepage-enhancements.js','utf8');
  const api=vm.runInNewContext(renderer+';({setExposure(value){platformExposure=value},developmentRows,internalReleaseRows,hasRunnableHomepageTarget,buildCard})',{
    document:{readyState:'loading',addEventListener(){}}
  });
  api.setExposure({unityWebEnabled:true,games:[]});
  const base=(id,cls)=>({id,canonical:{
    identity:{gameId:id,name:id},
    lifecycle:{state:'ACTIVE'},
    production:{class:cls},
    sources:{web:{playable:false,archive:false},unity:{projectPath:'unity-games/'+id}}
  }});
  const dev=base('dev-without-release','DEVELOPMENT_CONFIRMED');
  const design=base('design-without-release','DESIGN_ONLY');
  const released=base('released-without-build','RELEASE_CONFIRMED');
  const clickOnly=base('control-only-prototype','DEVELOPMENT_CONFIRMED');
  clickOnly.ownerWebSourceState='WITHDRAWN_SIMPLE_PROTOTYPE';
  clickOnly.canonical.sources.web.state='WITHDRAWN_SIMPLE_PROTOTYPE';
  const owned=base('full-game-with-legacy-test','DEVELOPMENT_CONFIRMED');
  owned.ownerExistingGame=true;
  owned.canonical.lifecycle.ownerExistingGame=true;
  owned.canonical.sources.web.state='WITHDRAWN_SIMPLE_PROTOTYPE';
  const list=api.developmentRows({games:[dev,design,released,clickOnly,owned]},{});
  assert.deepEqual(Array.from(list,game=>game.id),['design-without-release','dev-without-release','full-game-with-legacy-test','released-without-build'],'game cards remain visible while gameplay QA is incomplete');
  assert.equal(list.some(game=>game.id===clickOnly.id),false,'control-only prototype must not appear in the game catalog shelf');
  assert.equal(api.hasRunnableHomepageTarget(dev),false,'source-only must not be treated as runnable');
  assert.equal(api.internalReleaseRows({games:[dev]},{}).length,0,'development must not be falsely promoted');
  const card=api.buildCard(dev);
  assert.match(card,/Roblox · 개발 중/);
  assert.match(card,/Unity 앱 · 개발 중/);
  assert.match(card,/Unity Web · 빌드없음/);
  assert.doesNotMatch(card,/<a[^>]*class="foldGameBtn[^"]*robloxAction"/);
  assert.doesNotMatch(card,/<a[^>]*class="foldGameBtn[^"]*unityAction"/);
  assert.doesNotMatch(card,/<a[^>]*class="foldGameBtn[^"]*unityWebAction"/);
  assert.match(card,/data-direct-play=""/);
});

test('runnable native tests remain accessible before release and survive web-only withdrawal',()=>{
  const policy=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
  const snap=buildHomepagePlatformExposure({policy,queue:{items:[{
    gameId:'access-test',productionClass:'DEVELOPMENT_CONFIRMED',
    robloxPublicationTarget:{placeId:'123456789',verified:true,published:true,dedicated:true},
    unityInternalBuildUrl:'https://example.com/access-test.apk',
    unityExecutionEvidence:{rawStageResults:{runtime:true},regressionPassed:false}
  }]}});
  assert.equal(snap.games[0].platforms.every(p=>p.executionAvailable===true),true);
  assert.equal(snap.games[0].platforms.every(p=>p.internalReleaseReady===false),true);
  const renderer=fs.readFileSync('assets/homepage-enhancements.js','utf8');
  const api=vm.runInNewContext(renderer+';({setExposure(value){platformExposure=value},internalReleaseLinks,hasRunnableHomepageTarget,hasInternalRelease})',{
    document:{readyState:'loading',addEventListener(){}}
  });
  api.setExposure(snap);
  const game={id:'access-test',canonical:{identity:{gameId:'access-test'},lifecycle:{state:'ACTIVE'},sources:{web:{state:'WITHDRAWN_SIMPLE_PROTOTYPE',playable:false,archive:true,path:'web-games/access-test'}}}};
  const links=api.internalReleaseLinks(game);
  assert.equal(links.roblox,'https://www.roblox.com/games/123456789');
  assert.equal(links.unity,'https://example.com/access-test.apk');
  assert.equal(links.web,'');
  assert.equal(api.hasRunnableHomepageTarget(game),false,'native execution must remain independent without becoming a Unity Web-only homepage card');
  assert.equal(api.hasInternalRelease(game),false);
});

test('source-only or failed builds and stale shared targets cannot become executable links',()=>{
  const policy=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
  const snap=buildHomepagePlatformExposure({policy,queue:{items:[{
    gameId:'blocked-access',robloxSharedTargetCurrent:false,
    robloxPublicationTarget:{placeId:'123456789',verified:true,shared:true},
    unityInternalBuildUrl:'https://example.com/failed.apk',unityRuntimeSmokeRunId:123,
    unityExecutionEvidence:{runtimePassed:false,rawStageResults:{runtime:false}}
  },{gameId:'source-only',unityProjectPath:'unity-games/source-only',robloxProjectPath:'roblox-games/source-only'}]}});
  assert.equal(snap.games.flatMap(g=>g.platforms).some(p=>p.executionAvailable===true),false);
  assert.equal(policy.serverHomepageIntegration.runnablePlatformAccess.releaseClassificationRequiredForLaunch,false);
  assert.deepEqual(policy.catalogNormalization.ownerWebAutoIngest.webExposureQuality.homepageWithdrawalPlatforms,['WEB']);
});

test('runtime catalog fills only missing active development games',()=>{
  const catalog={games:[
    {id:'cozy-island',name:'MAIN 포근섬',marker:'main'}
  ]};
  const runtimeCatalog={games:[
    {id:'cozy-island',name:'RUNTIME 포근섬',marker:'runtime'},
    {id:'horror-escape-room',name:'심야 술래잡기',marker:'runtime'},
    {id:'retired-game',name:'퇴역 게임',marker:'runtime'}
  ]};
  const developmentQueue={items:[
    {gameId:'cozy-island',productionClass:'DEVELOPMENT_CONFIRMED',status:'ACTIVE'},
    {gameId:'horror-escape-room',productionClass:'DEVELOPMENT_CONFIRMED',status:'ACTIVE'},
    {gameId:'retired-game',productionClass:'DEVELOPMENT_CONFIRMED',status:'RETIRED'}
  ]};

  const added=mergeRuntimeCatalogMissingGames({catalog,runtimeCatalog,developmentQueue});

  assert.deepEqual(added,['horror-escape-room']);
  assert.equal(catalog.games.length,2);
  assert.equal(catalog.games.find(x=>x.id==='cozy-island').name,'MAIN 포근섬');
  assert.equal(catalog.games.find(x=>x.id==='horror-escape-room').name,'심야 술래잡기');
  assert.equal(catalog.games.some(x=>x.id==='retired-game'),false);
});

test('runtime catalog merge is a no-op without valid arrays',()=>{
  assert.deepEqual(mergeRuntimeCatalogMissingGames({catalog:{},runtimeCatalog:{},developmentQueue:{}}),[]);
});

test('dedicated Roblox publication is wired into status and homepage propagation',()=>{
  const status=fs.readFileSync('.github/workflows/company-status-sync.yml','utf8');
  const homepage=fs.readFileSync('.github/workflows/homepage-manager.yml','utf8');

  assert.match(status,/Owner Roblox Dedicated Private Experiences/);
  assert.match(status,/COMPANY_RUNTIME_GAME_CATALOG_PATH=\/tmp\/company-runtime-game-catalog\.json/);
  assert.match(homepage,/github\.event_name.*pull_request/);
  assert.match(homepage,/HOMEPAGE_PLATFORM_EXPOSURE_SOURCE=COMPANY_RUNTIME_DERIVED_FRESH/);
});


test('visible game titles stay aligned with Roblox project titles',()=>{
  const catalog=JSON.parse(fs.readFileSync('game-catalog.json','utf8'));
  const expected={
    'cozy-island':'포근섬: 작은 왕국 키우기',
    'daechung-rpg':'5포탈 RPG: 던전 파티',
    'horror-escape-room':'심야 대탈출'
  };
  for(const [id,title] of Object.entries(expected)){
    const project=JSON.parse(fs.readFileSync(`roblox-games/${id}/default.project.json`,'utf8'));
    assert.equal(project.name,title);
    const game=(catalog.games||[]).find(row=>row.id===id);
    if(game)assert.equal(game.name,title);
  }
});


test('homepage Roblox link prefers the dedicated canonical publication target over stale release evidence',()=>{
  const policy=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
  const snap=buildHomepagePlatformExposure({
    policy,
    catalog:{games:[{id:'cozy-island',name:'포근섬'}]},
    queue:{items:[{
      gameId:'cozy-island',
      gameName:'포근섬',
      robloxProjectPath:'roblox-games/cozy-island',
      robloxInternalReleaseReady:true,
      robloxPublicationTarget:{placeId:'116850096561713',verified:true,dedicated:true},
      robloxReleaseEvidence:{placeId:'112507741861842',published:true,publicRelease:false}
    }]}
  });
  const roblox=snap.games[0].platforms.find(row=>row.platform==='ROBLOX');
  assert.equal(roblox.placeId,'116850096561713');
  assert.equal(roblox.internalUrl,'https://www.roblox.com/games/116850096561713');
  assert.deepEqual(snap.supportedPlatforms,policy.serverHomepageIntegration.supportedPlatforms);
  assert.match(snap.centralPolicyFingerprint,/^[a-f0-9]{64}$/);
});

test('homepage preserves a verified dedicated private Roblox deployment while the latest source revalidates',()=>{
  const policy=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
  const snap=buildHomepagePlatformExposure({
    policy,
    catalog:{games:[{id:'cozy-island',name:'포근섬'}]},
    queue:{items:[{
      gameId:'cozy-island',
      gameName:'포근섬',
      robloxProjectPath:'roblox-games/cozy-island',
      robloxSourceCommit:'a'.repeat(40),
      robloxBuildArtifactIdentity:'sha256:'+'b'.repeat(64),
      robloxRuntimePassed:false,
      robloxInternalReleaseReady:false,
      robloxPublicationTarget:{
        universeId:'10767445741',
        placeId:'116850096561713',
        verified:true,
        dedicated:true,
        shared:false,
        internalOnly:true,
        bootstrapState:'PUBLISHED_PRIVATE'
      }
    }]}
  });
  const roblox=snap.games[0].platforms.find(row=>row.platform==='ROBLOX');
  assert.equal(roblox.placeId,'116850096561713');
  assert.equal(roblox.internalUrl,'https://www.roblox.com/games/116850096561713');
  assert.equal(roblox.internalReleaseReady,false);
  assert.equal(roblox.releaseReadiness.homepageReady,false);
  assert.equal(roblox.historicalInternalRelease,true);
  assert.equal(roblox.internalReleaseState,'DEPLOYED_REVALIDATING');
});


test('homepage suppresses superseded shared Roblox targets until a dedicated current target exists',()=>{
  const policy=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
  const snap=buildHomepagePlatformExposure({
    policy,
    catalog:{games:[{id:'bug-defense',name:'곤충 디펜스'}]},
    queue:{items:[{
      gameId:'bug-defense',
      gameName:'곤충 디펜스',
      robloxProjectPath:'roblox-games/bug-defense',
      robloxInternalReleaseReady:true,
      robloxInternalReleasePublished:true,
      robloxSharedTargetCurrent:false,
      robloxPublicationTarget:{placeId:'112507741861842',universeId:'10766974456',verified:true,source:'owner-pinned-open-cloud-target'},
      robloxReleaseEvidence:{placeId:'112507741861842',published:true,publicRelease:false}
    }]}
  });
  const roblox=snap.games[0].platforms.find(row=>row.platform==='ROBLOX');
  assert.equal(roblox.placeId,null);
  assert.equal(roblox.internalUrl,null);
  assert.equal(roblox.internalReleaseReady,false);
  assert.equal(roblox.publicReleaseReady,false);
  assert.equal(roblox.internalLinkSuppressedReason,'STALE_SHARED_TARGET_AWAITING_DEDICATED_TARGET');
});

test('homepage exposes only verified Unity WebGL and preserves independent Roblox development',()=>{
  const policy=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
  const snap=buildHomepagePlatformExposure({policy,catalog:{games:[]},queue:{items:[]}});
  const web=policy.directNativeDualPlatformDevelopment.unityWebValidationSurface;
  assert.equal(policy.serverHomepageIntegration.showUnityWeb,true);
  assert.equal(policy.serverHomepageIntegration.showWebPlay,false);
  assert.equal(snap.unityWebEnabled,true);
  assert.equal(policy.directNativeDualPlatformDevelopment.unityWebRequired,true);
  assert.equal(policy.directNativeDualPlatformDevelopment.unityWebGateRequired,false);
  assert.equal(web.sameCanonicalUnityProjectRequired,true);
  assert.equal(web.releaseStage,false);
  assert.equal(policy.ownerUnityWebHomepageOnly20261010.genericHtmlCssJavascriptCanvasGameAuthoringForbidden,true);
  assert.equal(policy.ownerUnityWebHomepageOnly20261010.homepageGameCardRequiresUnityWeb,true);
  const surface=policy.serverHomepageIntegration.unityWebValidationSurface;
  assert.equal(surface.homepageLinkGate,'UNITY_WEB_3D_QA_AND_COMPLETE_DEPLOYED_BUNDLE');
  assert.equal(surface.homepageLinkQaPassRequired,true);
  assert.equal(surface.homepageLinkEvidenceFilesRequired,true);
  const renderer=fs.readFileSync('assets/homepage-enhancements.js','utf8');
  assert.match(renderer,/bindAvailableUnityWebSurfaces\(catalog\)/);
  assert.match(renderer,/projectPath===`unity-games\/\$\{id\}`/);
  assert.match(renderer,/unity-web-deploy-manifest\.json/);
  assert.match(renderer,/unity-web-independent-qa\.json/);
  assert.match(renderer,/upper-platform-development-readiness\.json/);
  assert.match(renderer,/method:'HEAD'/);
  assert.match(renderer,/unityWebAvailable:true/);
  assert.match(renderer,/return Boolean\(links\.unityWeb\);/);
  assert.doesNotMatch(renderer,/button\(links\.web,'웹 플레이'/);
  assert.doesNotMatch(renderer,/bundleGroupsFromUnityIndex/);
});

test('homepage keeps Roblox runtime truth separate from independent QA',()=>{
  const policy=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
  const snap=buildHomepagePlatformExposure({
    policy,
    catalog:{games:[{id:'runtime-truth',name:'Runtime Truth'}]},
    queue:{items:[{
      gameId:'runtime-truth',
      gameName:'Runtime Truth',
      robloxProjectPath:'roblox-games/runtime-truth',
      robloxPublicationTarget:{placeId:'1234567890',verified:true,dedicated:true},
      robloxInternalReleaseReady:true,
      robloxIndependentQaPassed:true,
      robloxRegressionPassed:true,
      robloxRuntimePassed:false,
      robloxRuntimeEvidence:null
    }]}
  });
  const row=snap.games[0];
  const roblox=row.platforms.find(platform=>platform.platform==='ROBLOX');
  assert.equal(roblox.runtimePassed,false);
  assert.equal(roblox.independentQaPassed,true);
  assert.equal(roblox.regressionPassed,true);
  assert.equal(roblox.internalReleaseReady,false);
  assert.equal(roblox.publicReleaseReady,false);
  assert.equal(row.externalPublicReleaseState,'INTERNAL_ONLY');
});

test('homepage platform exposure fails closed when central policy adds a platform without an implementation adapter',()=>{
  const policy=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
  const changed=structuredClone(policy);
  changed.serverHomepageIntegration.supportedPlatforms=[...changed.serverHomepageIntegration.supportedPlatforms,'FORTNITE_UEFN'];
  changed.serverHomepageIntegration.perGamePlatformStates=[...changed.serverHomepageIntegration.perGamePlatformStates,'FORTNITE_UEFN'];
  assert.throws(()=>buildHomepagePlatformExposure({policy:changed,catalog:{games:[]},queue:{items:[]}}),/HOMEPAGE_PLATFORM_ADAPTER_MISSING:FORTNITE_UEFN/);
});

// 완주 기록: 중복 재시도·미완료·잘못된 증거를 실제 집계에서 제외한다.
test('completion history counts unique exact published cycles and preserves history during repair',()=>{
  const proof={gameId:'demo',sourceRevision:'a'.repeat(40),artifactIdentity:'sha256:'+ 'b'.repeat(64),artifactRunId:10,workflowRunId:20,placeId:'30',universeId:'40',versionNumber:1,published:true,status:'PUBLISHED',publishedAt:'2026-09-28T12:00:00Z',finalReviewPassed:true,f9ReleaseRegressionPassed:true,authority:'roblox-f9-immutable-canonical-publish-queue'};
  const item={gameId:'demo',robloxQualityBuildUpRequired:true,robloxCanonicalPublishQueue:[proof,{...proof,workflowRunId:21,publishedAt:'2026-09-29T12:00:00Z'},{...proof,sourceRevision:'c'.repeat(40),published:false},{...proof,sourceRevision:'d'.repeat(40),f9ReleaseRegressionPassed:false},{...proof,sourceRevision:'e'.repeat(40),gameId:'other'}],robloxLastCanonicalPublishedEvidence:{...proof,authority:'roblox-open-cloud-f9-verified-canonical-publish'}};
  const before=JSON.stringify(item);
  const result=verifiedCompletionHistory(item);
  assert.equal(result.count,1);
  assert.equal(result.lastCompletedAt,proof.publishedAt);
  assert.equal(result.evidenceUrl,'https://github.com/hans1177/jaewoon-games/actions/runs/20');
  assert.equal(JSON.stringify(item),before);
  for(const override of [{sourceRevision:''},{artifactIdentity:''},{workflowRunId:0},{publishedAt:'bad'},{status:'RETRY_REQUIRED'},{authority:'unverified'},{cycleId:'wrong'},{versionNumber:0},{placeId:''}]){
    assert.equal(verifiedCompletionHistory({gameId:'demo',robloxCanonicalPublishQueue:[{...proof,...override}]}).count,0,JSON.stringify(override));
  }
});

test('completion history reports total separately from ten recent evidence links',()=>{
  const rows=Array.from({length:12},(_,i)=>({sourceRevision:i.toString(16).padStart(40,'0'),artifactIdentity:'sha256:'+'a'.repeat(64),workflowRunId:100+i,buildRunId:1,runtimeRunId:2,independentQaRunId:3,regressionRunId:4,status:'PUBLISHED',published:true,publishedAt:`2026-09-${String(i+1).padStart(2,'0')}T00:00:00Z`,authority:'unity-f9-exact-canonical-internal-release'}));
  const result=verifiedCompletionHistory({unityCanonicalPublishHistory:rows,unityCanonicalReleaseEvidence:rows.at(-1)},'UNITY');
  assert.equal(result.count,12);
  assert.equal(result.records.length,10);
  assert.equal(result.lastCompletedAt,rows.at(-1).publishedAt);
  assert.equal(verifiedCompletionHistory({unityInternalReleaseReady:true,unityInternalReleaseEvidence:rows[0]},'UNITY').count,0);
  assert.equal(verifiedCompletionHistory({unityCanonicalReleaseEvidence:{...rows[0],regressionRunId:null}},'UNITY').count,0);
});
