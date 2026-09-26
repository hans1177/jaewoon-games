import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {mergeRuntimeCatalogMissingGames} from '../tools/company-status-sync.mjs';
import {buildHomepagePlatformExposure} from '../tools/company-homepage-platform-exposure-sync.mjs';

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

test('company status sync keeps checkout bounded while preserving exact push diff recovery',()=>{
  const status=fs.readFileSync('.github/workflows/company-status-sync.yml','utf8');
  const checkout=status.match(/- name: Checkout latest main[\s\S]*?(?=\n      - name:)/)?.[0]||'';
  assert.match(checkout,/fetch-depth:\s*1/);
  assert.match(checkout,/fetch-tags:\s*false/);
  assert.doesNotMatch(checkout,/fetch-depth:\s*0/);
  assert.match(status,/git fetch --no-tags --depth=1 origin "\$before"/);
  assert.match(status,/git diff --name-only "\$before" "\$after" -- web-games\//);
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
    'horror-escape-room':'심야 감염전 [4대4]'
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
  assert.equal(roblox.internalReleaseReady,true);
  assert.equal(roblox.publicReleaseReady,false);
  assert.equal(roblox.internalLinkSuppressedReason,'STALE_SHARED_TARGET_AWAITING_DEDICATED_TARGET');
});

test('homepage exposes Unity Web as the required pre-native development test surface without release authority',()=>{
  const policy=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
  const snap=buildHomepagePlatformExposure({policy,catalog:{games:[]},queue:{items:[]}});
  const web=policy.directNativeDualPlatformDevelopment.unityWebValidationSurface;
  assert.equal(policy.serverHomepageIntegration.showUnityWeb,true);
  assert.equal(snap.unityWebEnabled,true);
  assert.equal(policy.directNativeDualPlatformDevelopment.unityWebRequired,true);
  assert.equal(policy.directNativeDualPlatformDevelopment.unityWebGateRequired,true);
  assert.equal(web.sameCanonicalUnityProjectRequired,true);
  assert.equal(web.requiredForDevelopmentAdmission,true);
  assert.equal(web.releaseStage,false);
  assert.equal(policy.serverHomepageIntegration.unityWebValidationSurface.homepageTestLinkIsNotDeploymentOrRelease,true);
  assert.equal(policy.serverHomepageIntegration.unityWebValidationSurface.homepageLinkGate,'DEPLOYABLE_BUNDLE_MANIFEST_OR_UNITY_INDEX_BUNDLE_PROBE');
  assert.equal(policy.serverHomepageIntegration.unityWebValidationSurface.homepageLinkQaPassRequired,false);
  assert.equal(policy.serverHomepageIntegration.unityWebValidationSurface.homepageLinkEvidenceFilesRequired,false);
  const renderer=fs.readFileSync('assets/homepage-enhancements.js','utf8');
  assert.match(renderer,/bindAvailableUnityWebSurfaces\(catalog\)/);
  assert.match(renderer,/projectPath===`unity-games\/\$\{id\}`/);
  assert.match(renderer,/href=`\/web-games\/\$\{id\}\//);
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
  assert.match(renderer,/웹 플레이/);
  assert.match(renderer,/links\.roblox\|\|links\.unity\|\|links\.unityWeb\|\|links\.web\|\|''/);
  assert.match(renderer,/return links\.roblox\|\|links\.unity\|\|links\.unityWeb\|\|links\.web\|\|'';/);
  assert.match(renderer,/const direct=links\.roblox\|\|links\.unity\|\|links\.unityWeb\|\|links\.web\|\|'';/);
  assert.doesNotMatch(renderer,/unityWebValidationVerified===true/);
});

test('homepage platform exposure fails closed when central policy adds a platform without an implementation adapter',()=>{
  const policy=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
  const changed=structuredClone(policy);
  changed.serverHomepageIntegration.supportedPlatforms=[...changed.serverHomepageIntegration.supportedPlatforms,'FORTNITE_UEFN'];
  changed.serverHomepageIntegration.perGamePlatformStates=[...changed.serverHomepageIntegration.perGamePlatformStates,'FORTNITE_UEFN'];
  assert.throws(()=>buildHomepagePlatformExposure({policy:changed,catalog:{games:[]},queue:{items:[]}}),/HOMEPAGE_PLATFORM_ADAPTER_MISSING:FORTNITE_UEFN/);
});
