// 파일명: qa/company-homepage-runtime-propagation.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import {validatedHomepageMedia,webTreeFingerprint} from '../tools/game-catalog-normalization.mjs';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
import {mergeRuntimeCatalogMissingGames,syncPublishedWebRoutes,applyHomepageRuntimeInfo} from '../tools/company-status-sync.mjs';
import {writePagesLanding} from '../tools/github-pages-landing.mjs';
import {buildHomepagePlatformExposure,verifiedCompletionHistory} from '../tools/company-homepage-platform-exposure-sync.mjs';

test('paused Unity Web never generates build probes or launch links',()=>{
  const source=fs.readFileSync('assets/homepage-enhancements.js','utf8');
  assert.doesNotMatch(source,/bindAvailableUnityWebSurfaces|unityWebTestUrl|unityWebAction/);
  const api=vm.runInNewContext(source+';({setExposure(value){platformExposure=value},platformLinks,buildCard})',{
    document:{readyState:'loading',addEventListener(){}},Date,Intl
  });
  api.setExposure({unityWebEnabled:true,games:[]});
  const game={id:'demo',unityWebAvailable:true,unityWebTestUrl:'/web-games/demo/unity/'};
  assert.equal(Object.hasOwn(api.platformLinks(game),'unityWeb'),false);
  assert.doesNotMatch(api.buildCard(game),/Unity Web|unityWebAction|\/web-games\/demo\/unity\//);
});

// 내부 홈페이지 정책: 웹게임 배포/실행 품질 점수를 URL 허용 조건으로 삼지 않는다.
// 실제 GitHub Pages 게시 검증은 기존 Web Release 파이프라인 책임이다.
test('internal web game links use the registered source path without a score gate',()=>{
  const renderer=fs.readFileSync('assets/homepage-enhancements.js','utf8');
  const api=vm.runInNewContext(renderer+';({setExposure(value){platformExposure=value},setPublishedRoutes(value){publishedWebRoutes=new Set(value)},platformLinks,buildCard,playableWebHref,sourceWebHref})',{
    document:{readyState:'loading',addEventListener(){}},Date,Intl
  });
  api.setExposure({games:[]});
  api.setPublishedRoutes(['web-games/fantasy-survival/']);
  const row=(id,state,archive=true)=>({id,canonical:{
    identity:{gameId:id,name:id},
    lifecycle:{state:'ACTIVE'},
    production:{class:'DEVELOPMENT_CONFIRMED'},
    sources:{web:{path:'web-games/'+id,archive,state}},
    publication:{web:{route:'web-games/'+id+'/',sourceTreeSha:'a'.repeat(40)}}
  }});
  const eligible=row('fantasy-survival','UNITY_WEB_VERIFICATION_REQUIRED');
  assert.equal(api.playableWebHref(eligible),'https://hans1177.github.io/jaewoon-games/web-games/fantasy-survival/');
  const unpublished={...eligible,canonical:{...eligible.canonical,publication:{web:{}}}};
  assert.equal(api.playableWebHref(unpublished),'','unpublished route must not claim verified play');
  assert.equal(api.sourceWebHref(unpublished),'https://hans1177.github.io/jaewoon-games/web-games/fantasy-survival/','original source links require published manifest evidence');
  assert.match(api.buildCard(unpublished),/원본 게임 · 열기/);
  assert.equal(api.platformLinks(eligible).web,api.playableWebHref(eligible));
  assert.match(api.buildCard(eligible),/일반 웹게임 · 플레이/);
  assert.doesNotMatch(api.buildCard(eligible),/href="[^"]+roblox\.com/);
  assert.equal(api.playableWebHref(row('retired-prototype','WITHDRAWN_SIMPLE_PROTOTYPE',false)),'');
  assert.equal(api.playableWebHref(row('missing-entry','ENTRY_MISSING_OR_INVALID')),'');
  for(const state of ['NON_GAME_SURFACE','ENTRY_MISSING_OR_INVALID','WITHDRAWN_SIMPLE_PROTOTYPE','PERMANENTLY_REMOVED_REJECTED_TEST']){
    const broken=row('broken-entry',state);
    assert.equal(api.sourceWebHref(broken),'',state);
    assert.doesNotMatch(api.buildCard(broken),/href="[^\"]*web-games\/broken-entry\//,state);
  }
  assert.equal(api.sourceWebHref(row('no-archive','UNITY_WEB_VERIFICATION_REQUIRED',false)),'');
});

test('공개 매니페스트와 정확히 같은 원본 게임만 메인 실행 링크에 동기화한다',()=>{
  const manifest={version:1,sourceSha:'b'.repeat(40),gameCount:2,
    routes:['web-games/demo/','web-games/stale/'],
    sourceTreeShas:{demo:'a'.repeat(40),stale:'c'.repeat(40)}};
  const catalog={games:[
    {id:'demo',webPath:'/web-games/demo/',hasWebArchive:true,ownerWebSourceState:'UNITY_WEB_VERIFICATION_REQUIRED'},
    {id:'stale',webPath:'/web-games/stale/',hasWebArchive:true,ownerWebSourceState:'UNITY_WEB_VERIFICATION_REQUIRED'},
    {id:'unpublished',webPath:'/web-games/unpublished/',hasWebArchive:true,ownerWebSourceState:'UNITY_WEB_VERIFICATION_REQUIRED'}
  ]};
  const result=syncPublishedWebRoutes({catalog,manifest,sourceTreeShaOf:root=>root==='web-games/demo'?'a'.repeat(40):'d'.repeat(40)});
  assert.equal(result.confirmed,1);
  assert.equal(result.notCurrent,1);
  assert.equal(catalog.games[0].webPublishedRoute,'web-games/demo/');
  assert.equal(catalog.games[1].webPublishedRoute,'');
  assert.equal(catalog.games[2].webPublishedRoute,'');
  assert.equal(Object.hasOwn(catalog.games[0],'webPublishedSourceSha'),false,'do not cause endless republish when manifest source commit advances');
  assert.throws(()=>syncPublishedWebRoutes({catalog,manifest:{...manifest,routes:['web-games/../bad/','web-games/stale/']},sourceTreeShaOf:()=>''}),/ROUTE_INVALID/);
  assert.throws(()=>syncPublishedWebRoutes({catalog,manifest:{...manifest,gameCount:3},sourceTreeShaOf:()=>''}),/MANIFEST_INVALID/);
});

test('바이브가 원본 카탈로그에 새 게임을 추가하면 다음 원본 배포 후 메인 버튼에 자동 반영된다',()=>{
  const entry=(id)=>({id,name:id,webPath:'web-games/'+id,hasWebArchive:true,
    ownerWebSourceState:'UNITY_WEB_VERIFICATION_REQUIRED',lifecycleState:'ACTIVE',
    productionClass:'DEVELOPMENT_CONFIRMED'});
  const catalog={games:[entry('first-game')]};
  const sha='a'.repeat(40),nextSha='b'.repeat(40);
  const makeManifest=(routes,sourceSha)=>({sourceSha,gameCount:routes.length,routes,
    sourceTreeShas:Object.fromEntries(routes.map(route=>[route.split('/')[1],route.includes('new-game')?nextSha:sha]))});
  const first=makeManifest(['web-games/first-game/'],'c'.repeat(40));
  syncPublishedWebRoutes({catalog,manifest:first,sourceTreeShaOf:()=>sha});
  assert.equal(catalog.games[0].webPublishedRoute,'web-games/first-game/');
  const newGame=entry('new-game');
  catalog.games.push(newGame); // Vibe의 정식 카탈로그 등록, 단순 HTML 원본 자동 생성과 구분
  assert.equal(newGame.webPublishedRoute,undefined,'not playable before original deployment');
  const published=makeManifest(['web-games/first-game/','web-games/new-game/'],'d'.repeat(40));
  const sourceTreeShaOf=root=>root.endsWith('new-game')?nextSha:sha;
  const next=syncPublishedWebRoutes({catalog,manifest:published,sourceTreeShaOf});
  assert.equal(next.confirmed,2);
  assert.equal(catalog.games[1].webPublishedRoute,'web-games/new-game/');
  assert.equal(catalog.games[1].webPublishedSourceTreeSha,nextSha);
  const snapshot=JSON.stringify(catalog.games);
  syncPublishedWebRoutes({catalog,manifest:published,sourceTreeShaOf});
  assert.equal(JSON.stringify(catalog.games),snapshot,'repeated Vibe run must not create duplicate game buttons or commits');
  const renderer=fs.readFileSync('assets/homepage-enhancements.js','utf8');
  const api=vm.runInNewContext(renderer+';({playableWebHref,setPublishedRoutes(value){publishedWebRoutes=new Set(value)}})',{
    document:{readyState:'loading',addEventListener(){}},Date,Intl});
  const withCanonical={...catalog.games[1],canonical:{
    identity:{gameId:'new-game'},lifecycle:{state:'ACTIVE'},
    sources:{web:{path:'web-games/new-game',archive:true,state:'UNITY_WEB_VERIFICATION_REQUIRED'}},
    publication:{web:{route:catalog.games[1].webPublishedRoute,sourceTreeSha:catalog.games[1].webPublishedSourceTreeSha}}
  }};
  assert.equal(api.playableWebHref(withCanonical),'','a catalog record alone cannot authorize play');
  api.setPublishedRoutes(published.routes);
  assert.equal(api.playableWebHref(withCanonical),'https://hans1177.github.io/jaewoon-games/web-games/new-game/');
  syncPublishedWebRoutes({catalog,manifest:first,sourceTreeShaOf});
  assert.equal(catalog.games[1].webPublishedRoute,'','missing next release disables the new button, not the game card');
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
    homepage:{runtime:{developmentActive:cls!=='DESIGN_ONLY'}},
    sources:{web:{path:'web-games/'+id,playable:false,archive:false},unity:{projectPath:'unity-games/'+id}}
  }});
  const dev=base('dev-without-release','DEVELOPMENT_CONFIRMED');
  const design=base('design-without-release','DESIGN_ONLY');
  const released=base('released-without-build','RELEASE_CONFIRMED');
  const list=api.developmentRows({games:[dev,design,released]},{});
  assert.deepEqual(Array.from(list,game=>game.id),['dev-without-release','released-without-build'],'only active development games remain displayed even while unverified');
  assert.equal(api.hasRunnableHomepageTarget(dev),false,'source-only must not be treated as runnable');
  assert.equal(api.internalReleaseRows({games:[dev]},{}).length,0,'development must not be falsely promoted');
  const card=api.buildCard(dev);
  assert.match(card,/Roblox · 개발 중/);
  assert.doesNotMatch(card,/원본 게임 · 열기/);
  assert.doesNotMatch(card,/https:\/\/hans1177.github.io\/jaewoon-games\/web-games\/dev-without-release\//);
  assert.doesNotMatch(card,/Unity Web/);
  assert.doesNotMatch(api.buildCard({...dev,unityWebAvailable:false}),/Unity Web/);
  assert.doesNotMatch(card,/<a[^>]*class="foldGameBtn[^"]*robloxAction"/);
  assert.doesNotMatch(card,/<a[^>]*class="foldGameBtn[^"]*unityAction"/);
  assert.doesNotMatch(card,/<a[^>]*class="foldGameBtn[^"]*unityWebAction"/);
  assert.match(card,/data-direct-play=""/);
});

// 회귀: 실행 링크는 선택적 QA 문서 장애와 무관하고, 하위 Unity 경로도 카드에 남아야 한다.
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
  // 메인: 철회·중단된 웹게임은 숨기고 배포된 Roblox만 웹 중단과 독립적으로 남긴다.
  const shouldList=game=>{
    const webState=String(game.canonical?.sources?.web?.state||game.ownerWebSourceState||'').toUpperCase();
    const roblox=(exposure.games.find(row=>row.gameId===game.id)?.platforms||[]).find(p=>p.platform==='ROBLOX');
    const deployed=Boolean(roblox?.placeId&&roblox?.internalUrl==='https://www.roblox.com/games/'+roblox.placeId&&(roblox.executionAvailable||roblox.historicalInternalRelease||roblox.internalReleaseReady));
    const stopped=['NON_GAME_SURFACE','DEVELOPMENT_STOPPED','DEVELOPMENT_PAUSED','OWNER_STOPPED','STOPPED','PAUSED','WITHDRAWN_SIMPLE_PROTOTYPE','ENTRY_MISSING_OR_INVALID','PERMANENTLY_REMOVED_REJECTED_TEST'].includes(webState);
    return webState!=='NON_GAME_SURFACE'&&(deployed||game.canonical?.homepage?.runtime?.developmentActive===true&&!stopped);
  };
  const expected=eligible.filter(shouldList);
  assert.deepEqual([...present].sort(),expected.map(row=>row.id).sort(),'정식 게임은 유지하고 출처만 있는 미검증 시제품은 제외한다');
  assert.ok(expected.length>3,'집중 개발 밖의 정상 게임도 노출한다');
  for(const row of eligible.filter(game=>!shouldList(game)))assert.equal(present.has(row.id),false,'시제품이 홈피에 남음: '+row.id);
  for(const row of expected)assert.ok(present.has(row.id),'실제 게임 누락: '+row.id);
});

test('철회된 웹게임은 숨기고 Roblox 배포가 확인된 게임은 남긴다',()=>{
  const renderer=fs.readFileSync('assets/homepage-enhancements.js','utf8');
  const api=vm.runInNewContext(renderer+';({setExposure(value){platformExposure=value},developmentRows,hasRunnableHomepageTarget,buildCard})',{document:{readyState:'loading',addEventListener(){}}});
  const row=(id,state)=>({id,canonical:{
    identity:{gameId:id,name:id},lifecycle:{state:'ACTIVE',ownerExistingGame:true},
    homepage:{runtime:{developmentActive:true}},
    production:{class:'DEVELOPMENT_CONFIRMED'},
    sources:{web:{path:'web-games/'+id,state},roblox:{projectPath:'roblox-games/'+id}}
  }});
  const clickOnly=row('click-only','WITHDRAWN_SIMPLE_PROTOTYPE');
  const invalid=row('missing-entry','ENTRY_MISSING_OR_INVALID');
  const realWeb=row('real-web','UNITY_WEB_VERIFICATION_REQUIRED');
  const native=row('verified-native','WITHDRAWN_SIMPLE_PROTOTYPE');
  api.setExposure({unityWebEnabled:true,games:[{gameId:'verified-native',platforms:[{
    platform:'ROBLOX',executionAvailable:true,historicalInternalRelease:true,placeId:'123456789',internalUrl:'https://www.roblox.com/games/123456789'
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

test('homepage disables Unity Web browser links without affecting native platforms',()=>{
  const policy=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
  const snap=buildHomepagePlatformExposure({policy,catalog:{games:[]},queue:{items:[]}});
  assert.deepEqual(snap.supportedPlatforms,['ROBLOX','UNITY']);
  assert.equal(snap.unityWebEnabled,false);
  assert.equal(policy.serverHomepageIntegration.showUnityWeb,false);
  assert.equal(policy.serverHomepageIntegration.unityWebValidationSurface.enabled,false);
  assert.equal(policy.directNativeDualPlatformDevelopment.unityWebRequired,false);
  assert.equal(policy.directNativeDualPlatformDevelopment.unityWebGateRequired,false);
  const renderer=fs.readFileSync('assets/homepage-enhancements.js','utf8');
  assert.doesNotMatch(renderer,/unityWebAction|bindAvailableUnityWebSurfaces|createUnityInstance/);
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

test('homepage platform policy fingerprint follows canonical changed fields and rejects missing authority',()=>{
  const policy=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
  const original=buildHomepagePlatformExposure({policy,catalog:{games:[]},queue:{items:[]}});
  assert.match(original.centralPolicyFingerprint,/^[a-f0-9]{64}$/);
  assert.equal(original.centralPolicy,'company-learning/platform-release-roadmap.json');
  assert.deepEqual(original.supportedPlatforms,policy.serverHomepageIntegration.supportedPlatforms);
  const changed=structuredClone(policy);
  changed.serverHomepageIntegration.version+=1;
  const updated=buildHomepagePlatformExposure({policy:changed,catalog:{games:[]},queue:{items:[]}});
  assert.notEqual(original.centralPolicyFingerprint,updated.centralPolicyFingerprint);
  const invalid=structuredClone(policy);
  invalid.serverHomepageIntegration.runtimeAuthority='unknown';
  assert.throws(()=>buildHomepagePlatformExposure({policy:invalid}),/HOMEPAGE_CENTRAL_POLICY_INVALID/);
  assert.throws(()=>buildHomepagePlatformExposure({policy:{}}),/HOMEPAGE_CENTRAL_POLICY_INVALID/);
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
  assert.match(manager,/const captureVersion=4;/);
  assert.match(manager,/const focusedEditIds=new Set/);
  assert.match(manager,/const shots=\\[\\[0,3\\.4\\]/);
  assert.match(manager,/concat=n=/);
  assert.match(manager,/editVersion/);
  assert.match(manager,/scale=1920:1080:flags=lanczos,setsar=1/);
  assert.match(manager,/media\.games\[id\]\.screenshots=frames\.map/);
  assert.match(manager,/source:'ACTUAL_GAMEPLAY_VIDEO_FRAME'/);
  assert.match(workflow,/node tools\/homepage-manager\.mjs --capture-release-media/);
  assert.match(manager,/const captureVersion=4;/);
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

test('Cloudflare runtime keeps canonical published web-game buttons without overriding Roblox runtime authority',()=>{
  const edge=fs.readFileSync('_worker.js','utf8').replace(/export\s+default\s*\{/,'const workerDefault = {');
  const merge=vm.runInNewContext(edge+';mergeRuntimeCatalog', {Date,Intl});
  const runtime={games:[{id:'demo',name:'Demo',lifecycleState:'ACTIVE',productionClass:'DEVELOPMENT_CONFIRMED',
    canonical:{publication:{roblox:{universeId:'runtime-authoritative'}},
      sources:{web:{path:'web-games/demo',archive:false,state:'WITHDRAWN_SIMPLE_PROTOTYPE'}}}}]};
  const source={games:[{id:'demo',name:'Demo',lifecycleState:'ACTIVE',webPath:'web-games/demo',hasWebArchive:true,
    ownerWebSourceState:'UNITY_WEB_VERIFICATION_REQUIRED',
    canonical:{sources:{web:{path:'web-games/demo',archive:true,state:'UNITY_WEB_VERIFICATION_REQUIRED'}},
      publication:{web:{route:'web-games/demo/',sourceTreeSha:'a'.repeat(40)},roblox:{universeId:'untrusted-static'}}}}]};
  const merged=merge(runtime,{projects:[]},{seeds:[]},{items:[]},source);
  assert.equal(merged.games.length,1);
  assert.equal(merged.games[0].canonical.publication.web.route,'web-games/demo/');
  assert.equal(merged.games[0].canonical.publication.web.sourceTreeSha,'a'.repeat(40));
  assert.equal(merged.games[0].canonical.publication.roblox.universeId,'runtime-authoritative');
  assert.equal(merged.games[0].canonical.sources.web.archive,true);
  source.games[0].canonical.publication.web={};
  const missing=merge(runtime,{projects:[]},{seeds:[]},{items:[]},source);
  assert.equal(Object.keys(missing.games[0].canonical.publication.web).length,0,'stale server publication must not activate play');
});

test('Cloudflare Pages keeps native runtime APIs while bypassing static assets',()=>{
  const routes=JSON.parse(fs.readFileSync('_routes.json','utf8'));
  assert.deepEqual(routes,{version:1,include:['/*'],exclude:['/assets/*','/test-game-candidates.json','/homepage-portfolio-status.json']});
  const edge=fs.readFileSync('_worker.js','utf8');
  assert.match(edge,/url\.pathname==='\/game-catalog\.json'/);
  assert.match(edge,/url\.pathname==='\/company-status\.json'/);
  assert.match(edge,/url\.pathname==='\/homepage-platform-exposure\.json'/);
  const homepage=fs.readFileSync('assets/homepage-enhancements.js','utf8');
  assert.match(homepage,/SYNC_INTERVAL_MS=30000/);
  assert.doesNotMatch(homepage,/probeFetch|unity-web-deploy-manifest|bindAvailableUnityWebSurfaces/);
  assert.match(homepage,/function platformLinks\(game\)/);
  const index=fs.readFileSync('index.html','utf8');
  assert.doesNotMatch(index,/prefetchVisibleGames|rel='prefetch'/);
});

// 영구 제거 게임은 오래된 런타임의 ACTIVE 상태보다 우선한다.
test('canonical permanent removal wins over stale active runtime and queue entries',()=>{
  const catalog={games:[],permanentRemovalPolicy:{ids:['ant-simulator','crystal-defense']}};
  const developmentQueue={items:['ant-simulator','crystal-defense','keep-game'].map(gameId=>({gameId,status:'ACTIVE',productionClass:'DEVELOPMENT_CONFIRMED'}))};
  const runtimeCatalog={games:developmentQueue.items.map(row=>({id:row.gameId,name:row.gameId,lifecycleState:'ACTIVE'}))};
  assert.deepEqual(mergeRuntimeCatalogMissingGames({catalog,runtimeCatalog,developmentQueue}),['keep-game']);
  assert.deepEqual(catalog.games.map(row=>row.id),['keep-game']);
});

test('edge catalog removes stale stopped games while showing new active development cards',()=>{
  const edge=fs.readFileSync('_worker.js','utf8').replace(/export\s+default\s*\{/,'const workerDefault = {');
  const merge=vm.runInNewContext(edge+';mergeRuntimeCatalog',{Date,Intl});
  const stale={games:[{id:'ant-simulator',lifecycleState:'ACTIVE',productionClass:'DEVELOPMENT_CONFIRMED'}]};
  const canonical={games:[{id:'simple-rpg',lifecycleState:'ACTIVE',productionClass:'DEVELOPMENT_CONFIRMED'}],permanentRemovalPolicy:{ids:['ant-simulator']}};
  assert.deepEqual(Array.from(merge(stale,{}, {},{},canonical).games,game=>game.id),['simple-rpg']);
});

// 실제 보존형 게시 디렉터리에서 지정된 삭제만 적용하고 나머지 바이트를 보존한다.
test('canonical Pages publisher removes stopped and rejected routes from retained output only',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'pages-removal-'));
  try{
    const site=path.join(root,'site');
    for(const id of ['keep-game','stopped-game','rejected-test']){
      fs.mkdirSync(path.join(site,'web-games',id),{recursive:true});
      fs.writeFileSync(path.join(site,'web-games',id,'index.html'),id+' original');
    }
    fs.mkdirSync(path.join(site,'assets','homepage-covers'),{recursive:true});
    fs.writeFileSync(path.join(site,'assets','homepage-covers','stopped-game.webp'),'removed');
    fs.writeFileSync(path.join(site,'assets','shared.txt'),'shared original');
    const catalog=path.join(root,'catalog.json'),manifest=path.join(root,'manifest.json'),exposure=path.join(root,'exposure.json');
    fs.writeFileSync(catalog,JSON.stringify({games:[{id:'keep-game',webPath:'web-games/keep-game'}],permanentRemovalPolicy:{ids:['stopped-game'],rejectedWebTestEntries:['rejected-test'],removedAssetFiles:['assets/homepage-covers/stopped-game.webp']}}));
    fs.writeFileSync(manifest,JSON.stringify({routes:['web-games/keep-game/'],gameCount:1}));
    fs.writeFileSync(exposure,JSON.stringify({games:[]}));
    for(let i=0;i<2;i++)writePagesLanding({site,catalogPath:catalog,manifestPath:manifest,exposurePath:exposure});
    assert.equal(fs.existsSync(path.join(site,'web-games','stopped-game')),false);
    assert.equal(fs.existsSync(path.join(site,'web-games','rejected-test')),false);
    assert.equal(fs.existsSync(path.join(site,'assets','homepage-covers','stopped-game.webp')),false);
    assert.equal(fs.readFileSync(path.join(site,'web-games','keep-game','index.html'),'utf8'),'keep-game original');
    assert.equal(fs.readFileSync(path.join(site,'assets','shared.txt'),'utf8'),'shared original');
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

// 기존 준비 코드를 실제 임시 Git 저장소에서 실행해 캐시가 원본 검증을 우회하지 못하게 한다.
test('Pages source cache restores only changed bytes and rejects unverified output',async()=>{
 const workflow=fs.readFileSync('.github/workflows/magic-forest-pages.yml','utf8');
 const cleanStart=workflow.indexOf("          const cacheDirectories=['assets'];");
 const cleanEnd=workflow.indexOf('          const catalog=',cleanStart);
 const verifyStart=workflow.indexOf('          const selectedAssets=[...refs].sort();');
 const verifyEnd=workflow.indexOf('          // Build only the game-authored HTML.',verifyStart);
 assert.ok(cleanStart>0&&cleanEnd>cleanStart&&verifyEnd>verifyStart);
 const code=workflow.slice(cleanStart,cleanEnd)+workflow.slice(verifyStart,verifyEnd);
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'pages-cache-')),before=process.cwd();
 try{
  process.chdir(root);fs.mkdirSync('assets');
  const bytes={'assets/keep.bin':Buffer.from([0,255,1]),'assets/change.bin':Buffer.from('canonical change'),'assets/missing.bin':Buffer.from('canonical missing')};
  for(const [file,value] of Object.entries(bytes))fs.writeFileSync(file,value);
  execFileSync('git',['init','-q']);execFileSync('git',['add','assets']);
  execFileSync('git',['-c','user.name=QA','-c','user.email=qa@example.invalid','commit','-qm','fixture']);
  const assetBlobs=new Map(Object.entries(bytes).map(([file,value])=>[file,crypto.createHash('sha1').update(Buffer.from('blob '+value.length+'\0')).update(value).digest('hex')]));
  const restores=[];
  const cp={execFileSync(command,args,options){restores.push(Array.from(args).slice(args.indexOf('--')+1));return execFileSync(command,args,options);}};
  const run=(executor=cp)=>vm.runInNewContext('(async()=>{\n'+code+'\n})()', {fs,path,crypto,Buffer,cp:executor,assetBlobs,refs:new Set(Object.keys(bytes)),site:'_site',console:{log(){}}});
  fs.writeFileSync('assets/old-untracked.bin','obsolete cached bytes');
  await run();assert.deepEqual(restores,[],'unchanged cache must avoid all source downloads');
  assert.equal(fs.existsSync('assets/old-untracked.bin'),false,'deleted source must not return through old cache');
  fs.writeFileSync('assets/change.bin','poisoned cache');fs.unlinkSync('assets/missing.bin');
  await run();assert.deepEqual(restores,[['assets/change.bin','assets/missing.bin']]);
  for(const [file,value] of Object.entries(bytes))assert.deepEqual(fs.readFileSync('_site/'+file),value);
  fs.writeFileSync('outside.txt','protected original');fs.unlinkSync('assets/change.bin');
  fs.symlinkSync(path.resolve('outside.txt'),'assets/change.bin');
  await run();assert.equal(fs.readFileSync('outside.txt','utf8'),'protected original');
  assert.equal(fs.lstatSync('assets/change.bin').isSymbolicLink(),false);
  fs.writeFileSync('assets/change.bin','unrepaired poison');
  await assert.rejects(()=>run({execFileSync(){}}),/GITHUB_PAGES_ASSET_SOURCE_MISMATCH/);
  restores.length=0;fs.rmSync('assets',{recursive:true,force:true});await run();
  assert.deepEqual(restores,[Object.keys(bytes).sort()],'a cache miss must use the unchanged canonical Git fallback');
 }finally{process.chdir(before);fs.rmSync(root,{recursive:true,force:true});}
});

// 동기화 회귀: 등록·출시 여부가 아닌 현재 개발 대기열과 보류 상태로 노출한다.
test('개발 중단·보류만 숨기고 대기열 누락 게임은 유지하며 재개 시 복원한다',()=>{
  const catalog={games:['working','paused','missing','held'].map(id=>({id,name:id,lifecycleState:'ACTIVE',productionClass:'DEVELOPMENT_CONFIRMED'}))};
  const developmentQueue={items:[{gameId:'working',status:'ACTIVE'},{gameId:'paused',status:'PAUSED',lifecycleState:'ACTIVE'},{gameId:'held',status:'ACTIVE',ownerDevelopmentHold:true}]};
  applyHomepageRuntimeInfo({catalog,developmentQueue});
  const renderer=fs.readFileSync('assets/homepage-enhancements.js','utf8');
  const api=vm.runInNewContext(renderer+';({developmentRows,recentModificationRows,activeLifecycle})',{document:{readyState:'loading',addEventListener(){}},Date,Intl});
  assert.deepEqual(Array.from(api.developmentRows(catalog,{}),row=>row.id).sort(),['missing','working']);
  assert.deepEqual(Array.from(api.recentModificationRows(catalog),row=>row.game.id).sort(),['missing','working']);
  developmentQueue.items[1].status='ACTIVE';
  applyHomepageRuntimeInfo({catalog,developmentQueue});
  assert.deepEqual(Array.from(api.developmentRows(catalog,{}),row=>row.id).sort(),['missing','paused','working']);
  assert.equal(catalog.games.find(row=>row.id==='missing').canonical.homepage.runtime.developmentActive,true);
});

test('집중 개발 3개와 플랫폼 우선순위는 다른 게임의 노출을 막지 않는다',()=>{
  const catalog={games:['selected','backlog','held'].map(id=>({id,name:id,lifecycleState:'ACTIVE',productionClass:'DEVELOPMENT_CONFIRMED'}))};
  const developmentQueue={items:catalog.games.map(g=>({gameId:g.id,status:'ACTIVE'}))};
  const policy={developmentAccess:{ROBLOX:'OWNER_HOLD',WEB:'ALWAYS_ALLOWED'},developmentLifecycleMachine:{focusedDevelopmentCaretakers:{enabled:true,focusScope:'OWNER_EXACT_GAME_AND_PLATFORM_ONLY',ownerFocusedGameIds:['selected','held'],ownerFocusedGamePlatforms:{selected:'WEB',held:'ROBLOX'}}}};
  applyHomepageRuntimeInfo({catalog,developmentQueue,policy});
  assert.deepEqual(catalog.games.filter(g=>g.canonical.homepage.runtime.developmentActive).map(g=>g.id).sort(),['backlog','held','selected']);
});

test('명시적인 영구 개발 제외 게임은 집중 대상이나 대기열 상태와 무관하게 숨긴다',()=>{
  const catalog={permanentRemovalPolicy:{ids:['excluded']},games:[{id:'excluded',name:'제외',lifecycleState:'ACTIVE',productionClass:'DEVELOPMENT_CONFIRMED'},{id:'normal',name:'정상',lifecycleState:'ACTIVE',productionClass:'DEVELOPMENT_CONFIRMED'}]};
  applyHomepageRuntimeInfo({catalog,developmentQueue:{items:[{gameId:'excluded',status:'ACTIVE'}]}});
  assert.equal(catalog.games.some(g=>g.id==='excluded'&&g.homepageInfo.developmentActive===true),false);
  assert.equal(catalog.games.find(g=>g.id==='normal').homepageInfo.developmentActive,true);
});

test('homepage title stars save favorite game ids and mobile game emoji shows only favorites',()=>{
  const index=fs.readFileSync('index.html','utf8');
  const source=fs.readFileSync('assets/homepage-enhancements.js','utf8');
  assert.match(index,/id="mobileFavoritesButton"[^>]*aria-controls="mobileFavoritesPanel"/);
  assert.match(index,/<b>⭐<\/b><span>즐겨찾기<\/span><\/button>/,'mobile bottom game menu must read favorites');
  assert.match(index,/id="mobileFavoritesPanel"[^>]*hidden/);
  assert.match(index,/id="mobileFavoritesList"/);
  assert.doesNotMatch(index,/<a href="#gameHub"><b>🎮<\/b>/);
  const saved=new Map();
  const storage={
    getItem:key=>saved.get(key)||null,
    setItem:(key,value)=>saved.set(key,value)
  };
  const list={innerHTML:'',dataset:{}},buttons=[];
  const document={
    readyState:'loading',addEventListener(){},
    getElementById:id=>id==='mobileFavoritesList'?list:null,
    querySelectorAll:()=>buttons
  };
  const api=vm.runInNewContext(source+';({loadFavorites,renderFavoriteGames,toggleFavorite,favoriteButton,buildCard,setRows(rows){favoriteDisplayRows=rows;},setFavorites(ids){favoriteGameIds=new Set(ids);}})',{document,localStorage:storage,Date,Intl});
  const visible={id:'sample-game',name:'실제 게임',canonical:{identity:{gameId:'sample-game',name:'실제 게임'}}};
  api.setRows([visible]);
  api.setFavorites(['retired-game']);
  api.renderFavoriteGames();
  assert.equal(list.dataset.favoriteCount,'0','discontinued games cannot reappear in the favorites list');
  assert.doesNotMatch(list.innerHTML,/retired-game/);
  assert.match(api.buildCard(visible),/class="foldGameTitleRow"/);
  assert.match(api.buildCard(visible),/data-favorite-id="sample-game"/);
  assert.match(api.buildCard(visible),/aria-pressed="false"/);
  const title={textContent:'실제 게임'};
  buttons.push({dataset:{favoriteId:'sample-game'},closest:s=>s==='.foldGameCard'?{querySelector:()=>title}:null,setAttribute(){},title:'',textContent:''});
  api.toggleFavorite('sample-game');
  assert.equal(buttons[0].textContent,'★');
  assert.equal(list.dataset.favoriteCount,'1');
  assert.match(list.innerHTML,/실제 게임/);
  assert.doesNotMatch(list.innerHTML,/retired-game/);
  assert.deepEqual(JSON.parse(saved.get('jaewoon-home-game-favorites-v1')),['retired-game','sample-game']);
  assert.deepEqual([...api.loadFavorites()],['retired-game','sample-game']);
  api.toggleFavorite('sample-game');
  assert.equal(buttons[0].textContent,'☆');
  assert.equal(list.dataset.favoriteCount,'0');
  assert.doesNotMatch(list.innerHTML,/실제 게임/);
  api.toggleFavorite('not-in-catalog');
  assert.equal(list.dataset.favoriteCount,'0');
});
