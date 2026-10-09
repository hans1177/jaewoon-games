import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {mergeRuntimeCatalogMissingGames} from '../tools/company-status-sync.mjs';
import {buildHomepagePlatformExposure,verifiedCompletionHistory} from '../tools/company-homepage-platform-exposure-sync.mjs';

test('개발 Unity WebGL의 /unity/ 경로가 없으면 기존 출력 루트의 실제 4종 빌드 파일을 검사한다',async()=>{
  const source=fs.readFileSync('assets/homepage-enhancements.js','utf8');
  const fetched=[];
  const engine=vm.runInNewContext(source+';({setExposure(value){platformExposure=value},bindAvailableUnityWebSurfaces})',{
    document:{readyState:'loading',addEventListener(){}},
    AbortController,setTimeout,clearTimeout,
    fetch:async(url,options={})=>{
      const location=String(url);
      fetched.push(location);
      if(location.includes('/unity/index.html'))return{ok:false};
      if(location.includes('/index.html'))return{ok:true,text:async()=>
        '<div id="unity-container"></div><script src="Build/demo.loader.js"></script><script>createUnityInstance(canvas, {dataUrl:"Build/demo.data", frameworkUrl:"Build/demo.framework.js", codeUrl:"Build/demo.wasm"});</script>'};
      if(location.includes('unity-web-deploy-manifest.json'))return{ok:false};
      if(options.method==='HEAD')return{ok:true};
      return{ok:false};
    }
  });
  engine.setExposure({unityWebEnabled:true,games:[]});
  const result=await engine.bindAvailableUnityWebSurfaces({games:[
    {id:'demo',canonical:{sources:{unity:{projectPath:'unity-games/demo'}}}}
  ]});
  assert.equal(result.games[0].unityWebAvailable,true);
  assert.equal(result.games[0].unityWebTestUrl,'/web-games/demo/');
  assert.ok(fetched.some(url=>url.includes('/unity/index.html')));
  assert.ok(fetched.some(url=>url.includes('/web-games/demo/index.html')));
  assert.equal(fetched.filter(url=>url.includes('/Build/demo.')).length,4);
});

test('실제 실행 경로가 없는 개발 게임은 숨기고 검증된 실행 게임만 노출한다',()=>{
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
  const list=api.developmentRows({games:[dev,design,released]},{});
  assert.deepEqual(Array.from(list,game=>game.id),[],'title-only cards cannot appear without a real runnable target');
  const playable=base('dev-with-real-web','DEVELOPMENT_CONFIRMED');
  playable.canonical.sources.web={playable:true,archive:true,path:'web-games/dev-with-real-web'};
  const runnable=api.developmentRows({games:[dev,playable,design,released]},{});
  assert.deepEqual(Array.from(runnable,game=>game.id),['dev-with-real-web']);
  assert.equal(api.hasRunnableHomepageTarget(playable),true);
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
  assert.equal(api.hasRunnableHomepageTarget(game),true);
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

test('homepage Unity Web is a separately verified development surface without a Roblox admission gate',()=>{
  const policy=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
  const snap=buildHomepagePlatformExposure({policy,catalog:{games:[]},queue:{items:[]}});
  const web=policy.directNativeDualPlatformDevelopment.unityWebValidationSurface;
  assert.equal(policy.serverHomepageIntegration.showUnityWeb,true);
  assert.equal(policy.serverHomepageIntegration.showWebPlay,true);
  assert.equal(policy.serverHomepageIntegration.ownerWebUpload.changedGameIdsOnly,false);
  assert.equal(policy.serverHomepageIntegration.ownerWebUpload.reconcileExistingCatalogGamesEveryStatusSync,true);
  assert.equal(policy.serverHomepageIntegration.managerContract.developmentProgressDisplay.cardVisibilityRequiresRunnableTarget,true);
  assert.equal(policy.serverHomepageIntegration.managerContract.developmentProgressDisplay.titleOnlyCardExposureForbidden,true);
  assert.equal(snap.unityWebEnabled,true);
  assert.equal(policy.directNativeDualPlatformDevelopment.unityWebRequired,true);
  assert.equal(policy.directNativeDualPlatformDevelopment.unityWebGateRequired,false);
  assert.equal(policy.ownerActiveDevelopmentScope20261009.robloxRequiresUnityWebReadiness,false);
  assert.equal(policy.ownerUnityWeb3dOnly20261009.finalGameplayDimension,'3D');
  assert.equal(web.sameCanonicalUnityProjectRequired,true);
  assert.equal(web.requiredForDevelopmentAdmission,false);
  assert.equal(policy.ownerActiveDevelopmentScope20261009.unityWebRequiresActualBrowserIndependentQaAndRegression,true);
  assert.equal(web.releaseStage,false);
  assert.equal(policy.serverHomepageIntegration.unityWebValidationSurface.homepageTestLinkIsNotDeploymentOrRelease,true);
  assert.equal(policy.serverHomepageIntegration.unityWebValidationSurface.homepageLinkGate,'DEPLOYABLE_BUNDLE_MANIFEST_OR_UNITY_INDEX_BUNDLE_PROBE');
  assert.equal(policy.serverHomepageIntegration.unityWebValidationSurface.homepageLinkQaPassRequired,false);
  assert.equal(policy.serverHomepageIntegration.unityWebValidationSurface.homepageLinkEvidenceFilesRequired,false);
  const renderer=fs.readFileSync('assets/homepage-enhancements.js','utf8');
  assert.match(renderer,/bindAvailableUnityWebSurfaces\(catalog\)/);
  assert.match(renderer,/projectPath===`unity-games\/\$\{id\}`/);
  assert.match(renderer,/for\(const href of \[/);
  assert.match(renderer,/`\/web-games\/\$\{id\}\/unity\/`/);
  assert.match(renderer,/`\/web-games\/\$\{id\}\/`/);
  assert.match(renderer,/const expected=`web-games\/\$\{id\}`/);
  assert.match(renderer,/return raw===expected\?`\/\$\{expected\}\/`:'';/);
  assert.match(renderer,/probeFetch\(`\$\{href\}index\.html\?ts=/);
  assert.match(renderer,/bundleGroupsFromUnityIndex/);
  assert.match(renderer,/renderCatalog\(catalog\);/);
  assert.match(renderer,/setTimeout\(\(\)=>controller\.abort\(\),2500\)/);
  assert.match(renderer,/Unity Web Player\|unity-container\|createUnityInstance\|\\\.loader\\\.js/);
  assert.match(renderer,/method:'HEAD'/);
  assert.match(renderer,/\['loader','data','framework','wasm'\]/);
  assert.match(renderer,/unityWebAvailable:true/);
  assert.match(renderer,/Unity Web · 개발중/);
  assert.match(renderer,/function playableWebHref\(row\)/);
  assert.match(renderer,/function hasRunnableHomepageTarget\(game\)/);
  assert.match(renderer,/\.filter\(hasRunnableHomepageTarget\)/,'only actual runnable targets may produce development cards');
  assert.doesNotMatch(renderer,/\.filter\(game=>productionClassOf\(game\)==='DEVELOPMENT_CONFIRMED'\|\|hasRunnableHomepageTarget\(game\)\)/);
  assert.match(renderer,/웹 플레이/);
  assert.match(renderer,/links\.roblox\|\|links\.unity\|\|links\.unityWeb\|\|links\.web\|\|''/);
  assert.match(renderer,/return links\.roblox\|\|links\.unity\|\|links\.unityWeb\|\|links\.web\|\|'';/);
  assert.match(renderer,/const direct=links\.roblox\|\|links\.unity\|\|links\.unityWeb\|\|links\.web\|\|'';/);
  assert.doesNotMatch(renderer,/unityWebValidationVerified===true/);
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
