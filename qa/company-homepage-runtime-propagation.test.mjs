// 파일명: qa/company-homepage-runtime-propagation.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import {validatedHomepageMedia,webTreeFingerprint} from '../tools/game-catalog-normalization.mjs';
import vm from 'node:vm';
import {mergeRuntimeCatalogMissingGames} from '../tools/company-status-sync.mjs';
import {buildHomepagePlatformExposure,verifiedCompletionHistory} from '../tools/company-homepage-platform-exposure-sync.mjs';

// 회귀: 웹 빌드 탐색을 제거해도 등록 게임과 네이티브 실행 링크는 유지한다.
test('유니티 웹 중지 시 게임별 탐색을 하지 않고 네이티브 카드만 표시',()=>{
  const source=fs.readFileSync('assets/homepage-enhancements.js','utf8');
  assert.doesNotMatch(source,/bindAvailableUnityWebSurfaces|unityWebTestUrl|unityWebAvailable|unityWebAction|probeFetch/);
  assert.match(source,/renderCatalog\(catalog\);/);
  const api=vm.runInNewContext(source+';({setExposure(value){platformExposure=value},developmentRows,internalReleaseRows,hasRunnableHomepageTarget,buildCard})',{
    document:{readyState:'loading',addEventListener(){}}
  });
  // 이전 배포가 웹 노출 활성화를 담고 있어도 프런트엔드에서 웹 링크를 만들지 않아야 한다.
  api.setExposure({unityWebEnabled:true,games:[]});
  const game={id:'native-only',lifecycleState:'ACTIVE',productionClass:'DEVELOPMENT_CONFIRMED',
    canonical:{identity:{gameId:'native-only'},production:{class:'DEVELOPMENT_CONFIRMED'},sources:{unity:{projectPath:'unity-games/native-only'}}}};
  assert.equal(api.developmentRows({games:[game]},{}).length,1);
  assert.equal(api.internalReleaseRows({games:[game]},{}).length,0);
  assert.equal(api.hasRunnableHomepageTarget(game),false);
  const card=api.buildCard(game);
  assert.match(card,/Roblox · 개발 중/);
  assert.match(card,/Unity 앱 · 개발 중/);
  assert.doesNotMatch(card,/Unity Web|unityWebAction|href="\/web-games\/native-only/);
});

test('Cloudflare 경로에서 정적 자산을 제외하고 Worker API와 HTML 처리를 유지',()=>{
  const routes=JSON.parse(fs.readFileSync('_routes.json','utf8'));
  assert.equal(routes.version,1);
  const matches=(pattern,path)=>new RegExp('^'+pattern.replace(/[.*+?^$\{\}()|[\]\\]/g,'\\$&').replace(/\\\*/g,'.*')+'$').test(path);
  const invokes=path=>routes.include.some(p=>matches(p,path))&&!routes.exclude.some(p=>matches(p,path));
  for(const uri of ['/','/index.html','/game-catalog.json','/company-status.json','/homepage-platform-exposure.json','/api/ai/gemini','/web-games/demo/','/web-games/demo/index.html','/web-games/_shared/touch-controls.js']){
    assert.equal(invokes(uri),true,'dynamic path missing '+uri);
  }
  for(const uri of ['/assets/homepage-enhancements.js','/assets/cover.webp','/sw.js','/web-games/demo/main.js','/web-games/demo/Build/demo.wasm.br','/web-games/demo/Build/demo.data.gz']){
    assert.equal(invokes(uri),false,'static path must not invoke Worker '+uri);
  }
});

test('card gallery uses the exact shared Roblox thumbnail and verified video frames',()=>{
  const source=fs.readFileSync('assets/homepage-enhancements.js','utf8');
  const api=vm.runInNewContext(source+';({mergeGame,buildCard,setExposure(value){platformExposure=value}})',{
    document:{readyState:'loading',addEventListener(){}},Date,Intl
  });
  api.setExposure({unityWebEnabled:false,games:[]});
  const row={id:'picture-demo',name:'게임 화면',productionClass:'DEVELOPMENT_CONFIRMED',
    canonical:{identity:{gameId:'picture-demo',name:'게임 화면'},marketing:{
      thumbnail:'assets/roblox-thumbnails/picture-demo.svg',
      homepageMedia:{small:{src:'assets/homepage-covers/picture-demo-480.webp',sha256:'a'.repeat(64)},
        screenshots:[{src:'assets/homepage-media/picture-demo-1.jpg',sha256:'b'.repeat(64),platform:'UNITY_WEB'}]}}}};
  const result=api.mergeGame(row);
  assert.equal(result.image,'assets/roblox-thumbnails/picture-demo.svg');
  const html=api.buildCard(row);
  assert.match(html,/data-gallery-game="picture-demo"/);
  assert.match(html,/data-gallery-step="1"/);
  assert.match(html,/picture-demo-1\.jpg/);
  assert.match(source,/touch-action:pan-x/);
  assert.match(source,/scroll-snap-type:x mandatory/);
});

// 검증: 기존 대기열에 없는 게임도 홈피에 나오고, 실행 증거가 없으면 버튼은 잠긴다.
test('homepage platform exposure covers all active registered games without inventing releases',()=>{
  const policy=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
  const catalog={games:[
    {id:'queued-game',name:'대기열 게임',lifecycleState:'ACTIVE'},
    {id:'catalog-only',name:'목록 전용 게임',lifecycleState:'ACTIVE'},
    {id:'retired-game',name:'종료 게임',lifecycleState:'RETIRED'}
  ]};
  const queue={items:[{gameId:'queued-game',gameName:'대기열 게임',productionClass:'DEVELOPMENT_CONFIRMED'}]};
  const snap=buildHomepagePlatformExposure({policy,queue,catalog});
  assert.deepEqual(snap.games.map(game=>game.gameId),['catalog-only','queued-game']);
  assert.equal(snap.games[0].gameName,'목록 전용 게임');
  assert.deepEqual(snap.games[0].platforms.map(p=>p.platform),['ROBLOX','UNITY']);
  assert.ok(snap.games[0].platforms.every(p=>p.internalReleaseReady===false&&p.executionAvailable===false));
  assert.ok(snap.games[0].platforms.every(p=>p.publicUrl===null&&p.internalUrl===null));
  assert.equal(snap.games.filter(game=>game.gameId==='queued-game').length,1);
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
  assert.equal(api.hasRunnableHomepageTarget(game),true,'verified native game execution stays accessible without Unity WebGL');
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


// 홈피: 기존 디자인·개발·출시 게임의 목록 누락을 금지하되 미검증 실행은 활성화하지 않는다.
test('실제 게임은 유지하고 버튼형 시제품과 진입점 없는 게임은 홈페이지에서 숨긴다',()=>{
  const catalog=JSON.parse(fs.readFileSync('game-catalog.json','utf8'));
  const exposure=JSON.parse(fs.readFileSync('homepage-platform-exposure.json','utf8'));
  const renderer=fs.readFileSync('assets/homepage-enhancements.js','utf8');
  const api=vm.runInNewContext(renderer+';({setExposure(value){platformExposure=value},developmentRows,internalReleaseRows})',{document:{readyState:'loading',addEventListener(){}}});
  api.setExposure(exposure);
  const available=api.internalReleaseRows(catalog,{});
  const present=new Set(available.map(row=>row.id));
  for(const row of api.developmentRows(catalog,{}))present.add(row.id);
  const eligible=catalog.games.filter(game=>
    !['RETIRED','REMOVED','ARCHIVED'].includes(String(game.canonical?.lifecycle?.state||game.lifecycleState||'').toUpperCase())
    &&['DESIGN_ONLY','DEVELOPMENT_CONFIRMED','RELEASE_CONFIRMED'].includes(String(game.canonical?.production?.class||game.productionClass||'').toUpperCase())
  );
  const shouldList=game=>{
    const state=String(game.canonical?.sources?.web?.state||game.ownerWebSourceState||'').toUpperCase();
    if(state==='NON_GAME_SURFACE')return false;
    if(!['WITHDRAWN_SIMPLE_PROTOTYPE','ENTRY_MISSING_OR_INVALID'].includes(state))return true;
    const platform=exposure.games?.find(row=>row.gameId===game.id);
    return (platform?.platforms||[]).some(row=>
      Boolean(row.internalUrl||row.publicUrl)&&(
        row.executionAvailable===true||
        (row.internalReleaseReady===true&&row.releaseReadiness?.homepageReady===true)||
        (row.platform==='ROBLOX'&&row.historicalInternalRelease===true)
      )
    );
  };
  const expected=eligible.filter(shouldList);
  assert.deepEqual([...present].sort(),expected.map(row=>row.id).sort(),'정식 게임은 유지하고 출처만 있는 미검증 시제품은 제외한다');
  assert.ok(eligible.length>expected.length,'실제 카탈로그에 제외 대상 시제품이 있다');
  for(const row of eligible.filter(game=>!shouldList(game)))assert.equal(present.has(row.id),false,'시제품이 홈피에 남음: '+row.id);
  for(const row of expected)assert.ok(present.has(row.id),'실제 게임 누락: '+row.id);
});

test('검증된 네이티브 게임은 철회된 웹 시제품과 무관하게 남고 버튼형 시제품은 숨긴다',()=>{
  const renderer=fs.readFileSync('assets/homepage-enhancements.js','utf8');
  const api=vm.runInNewContext(renderer+';({setExposure(value){platformExposure=value},developmentRows,hasRunnableHomepageTarget,buildCard})',{document:{readyState:'loading',addEventListener(){}}});
  const row=(id,state)=>({id,canonical:{
    identity:{gameId:id,name:id},lifecycle:{state:'ACTIVE',ownerExistingGame:true},
    production:{class:'DEVELOPMENT_CONFIRMED'},
    sources:{web:{path:'web-games/'+id,state},roblox:{projectPath:'roblox-games/'+id}}
  }});
  const clickOnly=row('click-only','WITHDRAWN_SIMPLE_PROTOTYPE');
  const invalid=row('missing-entry','ENTRY_MISSING_OR_INVALID');
  const realWeb=row('real-web','UNITY_WEB_VERIFICATION_REQUIRED');
  const native=row('verified-native','WITHDRAWN_SIMPLE_PROTOTYPE');
  api.setExposure({unityWebEnabled:true,games:[{gameId:'verified-native',platforms:[{
    platform:'ROBLOX',executionAvailable:true,internalUrl:'https://www.roblox.com/games/123456789'
  }]}]});
  const visible=api.developmentRows({games:[clickOnly,invalid,realWeb,native]},{});
  assert.deepEqual(Array.from(visible,game=>game.id),['real-web','verified-native']);
  assert.equal(api.hasRunnableHomepageTarget(native),true);
  assert.match(api.buildCard(native),/https:\/\/www\.roblox\.com\/games\/123456789/);
  assert.equal(api.hasRunnableHomepageTarget(clickOnly),false);
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

test('the development queue recreates missing homepage cards without pretending to have a build',()=>{
  const catalog={games:[]};
  const queue={items:[
    {gameId:'queued-game',gameName:'새 게임',productionClass:'DEVELOPMENT_CONFIRMED',status:'ACTIVE',currentStep:'SOURCE_UPDATE'},
    {gameId:'removed-game',productionClass:'DEVELOPMENT_CONFIRMED',status:'RETIRED'}
  ]};
  const added=mergeRuntimeCatalogMissingGames({catalog,runtimeCatalog:{games:[]},developmentQueue:queue});
  assert.deepEqual(added,['queued-game']);
  assert.equal(catalog.games.length,1);
  assert.equal(catalog.games[0].name,'새 게임');
  assert.equal(catalog.games[0].homepageWebPlayable,false);
  assert.equal(catalog.games[0].productionClass,'DEVELOPMENT_CONFIRMED');
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

test('중앙정책과 홈페이지 노출 정보가 유니티 웹 중지를 일관되게 적용',()=>{
  const policy=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
  const snap=buildHomepagePlatformExposure({policy,catalog:{games:[]},queue:{items:[]}});
  assert.equal(policy.developmentAccess.UNITY_WEB,'OWNER_HOLD');
  assert.equal(policy.unityWebFirstStage.enabled,false);
  assert.equal(policy.serverHomepageIntegration.showUnityWeb,false);
  assert.equal(policy.serverHomepageIntegration.unityWebValidationSurface.enabled,false);
  assert.equal(policy.serverHomepageIntegration.managerContract.developmentProgressDisplay.webTestButtonEnabled,false);
  assert.equal(snap.unityWebEnabled,false);
  assert.equal(policy.directNativeDualPlatformDevelopment.unityWebRequired,false);
  assert.equal(policy.directNativeDualPlatformDevelopment.unityWebGateRequired,false);
  assert.equal(policy.serverHomepageIntegration.showInternalReleaseState,true);
  assert.deepEqual(snap.supportedPlatforms,['ROBLOX','UNITY']);
  const renderer=fs.readFileSync('assets/homepage-enhancements.js','utf8');
  assert.doesNotMatch(renderer,/bindAvailableUnityWebSurfaces|probeFetch|unityWebAction/);
  assert.match(renderer,/function playableWebHref\(row\)/);
  assert.match(renderer,/function hasRunnableHomepageTarget\(game\)/);
  assert.match(renderer,/renderCatalog\(catalog\);/);
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

test('실제 플레이 슬라이드는 원본 게임·화면비·해시 일치 시에만 표시',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'homepage-frames-'));
  const id='verified-frames';
  try{
    const save=(relative,bytes)=>{
      const filename=path.join(root,relative);
      fs.mkdirSync(path.dirname(filename),{recursive:true});
      fs.writeFileSync(filename,bytes);
      return {src:relative,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')};
    };
    const html='web-games/'+id+'/index.html';
    const htmlInfo=save(html,Buffer.from('<html><canvas></canvas></html>'));
    const artifactIdentity=webTreeFingerprint(fs,path.join(root,'web-games',id));
    const small=save('assets/homepage-covers/'+id+'-480.webp',Buffer.from('original-card-webp'));
    const cover=save('assets/homepage-covers/'+id+'.webp',Buffer.from('original-hero-webp'));
    const movie=save('assets/homepage-media/'+id+'.mp4',Buffer.from('real-mp4-test'));
    const capturedAt='2026-10-11T00:00:00.000Z';
    const sourceRevision='a'.repeat(40),platform='WEB';
    const video={...movie,gameId:id,platform,sourceRevision,artifactIdentity,capturedAt,seconds:11,
      dependencies:[{path:html,sha256:htmlInfo.sha256}],runtimeVerification:{pass:true,inputEvents:9,visualChangeObserved:true}};
    const screenshots=[2,6,10].map((second,index)=>{
      const bytes=Buffer.concat([Buffer.from([255,216,255]),Buffer.from('frame-'+second),Buffer.from([255,217])]);
      return {...save('assets/homepage-media/'+id+'-'+(index+1)+'.jpg',bytes),
        gameId:id,platform,sourceRevision,artifactIdentity,capturedAt,second,
        source:'ACTUAL_GAMEPLAY_VIDEO_FRAME',width:1920,height:1080};
    });
    const entry={gameId:id,titleEn:'Test',titleKo:'시험',small,cover,video,screenshots};
    const accepted=validatedHomepageMedia(id,entry,{root});
    assert.equal(accepted.video.src,movie.src);
    assert.equal(accepted.screenshots.length,3);
    assert.equal(accepted.kind,'MARKETING_ARTWORK');
    assert.equal(validatedHomepageMedia(id,{...entry,screenshots:[{...screenshots[0],platform:'ROBLOX'}]},{root}).screenshots,undefined);
    assert.equal(validatedHomepageMedia(id,{...entry,screenshots:[{...screenshots[0],width:960}]},{root}).screenshots,undefined);
    fs.appendFileSync(path.join(root,screenshots[1].src),'changed');
    assert.equal(validatedHomepageMedia(id,entry,{root}).screenshots,undefined);
    fs.writeFileSync(path.join(root,html),'modified-game-source');
    const stale=validatedHomepageMedia(id,entry,{root});
    assert.equal(stale.video,undefined);
    assert.equal(stale.screenshots,undefined);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('기존 홈페이지 매니저가 원본 타이틀을 보존하면서 영상에서만 사진을 추출',()=>{
  const manager=fs.readFileSync('tools/homepage-manager.mjs','utf8');
  const workflow=fs.readFileSync('.github/workflows/homepage-manager.yml','utf8');
  assert.match(manager,/recordVideo:\{dir:temp,size:\{width:1920,height:1080\}/);
  assert.match(manager,/const captureVersion=3;/);
  assert.match(manager,/scale=1920:1080:flags=lanczos,setsar=1/);
  assert.match(manager,/media\.games\[id\]\.screenshots=frames\.map/);
  assert.match(manager,/source:'ACTUAL_GAMEPLAY_VIDEO_FRAME'/);
  assert.match(workflow,/node tools\/homepage-manager\.mjs --capture-release-media/);
  assert.match(manager,/const captureVersion=3;/);
});


test('homepage title cards preserve canonical names and compact original artwork',()=>{
  const source=fs.readFileSync('assets/homepage-enhancements.js','utf8');
  const api=vm.runInNewContext(source+';({mergeGame,buildCard})',{
    document:{readyState:'loading',addEventListener(){}},Date,Intl
  });
  const canonical=(id,name,thumbnail,homepageMedia)=>({
    id,name,canonical:{
      identity:{gameId:id,name,description:'실제 게임 설명'},
      marketing:{thumbnail,...(homepageMedia?{homepageMedia}:{})}
    }
  });
  const cover={src:'assets/homepage-covers/sample-game.webp',sha256:'a'.repeat(64)};
  const small={src:'assets/homepage-covers/sample-game-480.webp',sha256:'b'.repeat(64)};
  const ordinary=api.mergeGame(canonical('sample-game','실제 게임 이름','assets/page-bg-v4.webp',{
    titleEn:'ENGLISH TITLE',titleKo:'실제 게임 이름',cover,small
  }));
  assert.equal(ordinary.name,'실제 게임 이름');
  assert.equal(ordinary.subtitle,'ENGLISH TITLE');
  assert.equal(ordinary.image,'assets/homepage-covers/sample-game-480.webp?v='+small.sha256.slice(0,12));
  assert.equal(ordinary.heroImage,'assets/homepage-covers/sample-game.webp?v='+cover.sha256.slice(0,12));
  assert.match(api.buildCard(canonical('sample-game','실제 게임 이름','assets/page-bg-v4.webp',{
    titleEn:'ENGLISH TITLE',titleKo:'실제 게임 이름',cover,small
  })),/<h3>실제 게임 이름<\/h3>/);
  const roblox=api.mergeGame(canonical('cozy-island','포근섬','assets/roblox-thumbnails/cozy-island.svg',{
    titleEn:'COZY ISLAND',titleKo:'포근섬',cover,small
  }));
  assert.equal(roblox.image,'assets/roblox-thumbnails/cozy-island.svg');
  assert.equal(roblox.heroImage,roblox.image);
  assert.equal(roblox.sharedRobloxThumbnail,true);
  const original=api.mergeGame(canonical('island-village','무인도 마을','assets/page-bg-v3.webp'));
  assert.equal(original.image,'assets/title-island-village.svg');
  assert.equal(original.originalLogo,true);
  assert.match(api.buildCard(canonical('island-village','무인도 마을','assets/page-bg-v3.webp')),/homeOriginalTitleLogo/);
  const originalArtwork=api.mergeGame(canonical('crystal-defense','수정 디펜스','assets/crystal-v2.webp'));
  assert.equal(originalArtwork.image,'assets/crystal-v2.webp','keep real existing game-specific art');
  assert.equal(originalArtwork.originalLogo,false);
});

test('homepage does not advertise generic app icons or shared page backgrounds as game title art',()=>{
  const source=fs.readFileSync('assets/homepage-enhancements.js','utf8');
  const api=vm.runInNewContext(source+';({mergeGame,buildCard})',{
    document:{readyState:'loading',addEventListener(){}},Date,Intl
  });
  const id='seed-roblox-roleplay-life-avat-brookhaven-rp';
  const row={id,name:'Harbor Days',canonical:{
    identity:{gameId:id,name:'Harbor Days'},
    marketing:{thumbnail:'assets/pwa-icon-512.png'}
  }};
  const m=api.mergeGame(row);
  assert.equal(m.image,'');
  assert.equal(m.missingImage,true);
  const html=api.buildCard(row);
  assert.match(html,/homeTitlePending/);
  assert.match(html,/대표 이미지 준비 중/);
  assert.doesNotMatch(html,/src="assets\/pwa-icon-512\.png"/);
  assert.match(source,/homeGallerySlide img\.homeOriginalTitleLogo\{object-fit:contain/);
  assert.match(source,/scroll-snap-type:x mandatory/);
});
