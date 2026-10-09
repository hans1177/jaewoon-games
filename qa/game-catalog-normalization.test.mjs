import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { applyHomepageAutoClassification, inferHomepageGenres, inferHomepagePlatform, ingestOwnerWebGameIds, normalizeCatalog, validateNormalizedCatalog, validatedHomepageMedia, webTreeFingerprint } from '../tools/game-catalog-normalization.mjs';

const catalog=JSON.parse(fs.readFileSync('game-catalog.json','utf8'));
const roadmap=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
const homepage=fs.readFileSync('assets/homepage-enhancements.js','utf8');
const manager=fs.readFileSync('tools/homepage-manager.mjs','utf8');
const sync=fs.readFileSync('tools/company-status-sync.mjs','utf8');

const validation=validateNormalizedCatalog(catalog);
assert.equal(validation.pass,true,validation.errors.join(','));
assert.equal(catalog.catalogSchemaVersion,2);
assert.equal(catalog.normalization?.canonicalRecordPath,'games[].canonical');
assert.equal(catalog.normalization?.canonicalFirst,true);
assert.equal(catalog.normalization?.homepageReadsCanonicalFirst,true);
assert.equal(catalog.normalization?.ordering,'CANONICAL_STABLE');
assert.equal(catalog.normalization?.orderField,'catalogOrder');
assert.equal(catalog.normalization?.orderContiguous,true);
assert.equal(catalog.runtimeCounts?.normalizedGames,catalog.games.length);

for(const [index,game] of catalog.games.entries()){
  assert.equal(Object.hasOwn(game,'newFeatureExpansionFrozen'),false,'legacy feature freeze must be removed: '+game.id);
  const c=game.canonical;
  assert(c,'canonical record missing: '+game.id);
  assert.equal(c.identity.gameId,game.id);
  assert.equal(c.production.class,String(game.productionClass||'DESIGN_ONLY').toUpperCase());
  assert.equal(c.lifecycle.state,String(game.lifecycleState||'ACTIVE').toUpperCase());
  assert.equal(c.homepage.runtime.authority,'company-runtime');
  assert.equal(game.catalogOrder,index+1);
  assert.equal(c.catalogOrder,index+1);
  assert.equal(c.homepage.category,game.homepageCategory);
}

const permanentlyRemoved=[
  'seed-roblox-battleground-fight-welcome-to-bloxburg',
  'seed-roblox-obby-party-minigam-tower-of-hell'
];
assert.deepEqual(catalog.permanentRemovalPolicy?.ids,permanentlyRemoved);
assert.equal(catalog.permanentRemovalPolicy?.reentryAllowed,false);
assert.equal(catalog.permanentRemovalPolicy?.automaticRecoveryAllowed,false);
assert.equal(catalog.permanentRemovalPolicy?.automaticMaintenanceAllowed,false);
for(const gameId of permanentlyRemoved)assert.equal(catalog.games.some(game=>game.id===gameId),false);

const policy=roadmap.catalogNormalization;
assert.equal(policy?.authority,'MACHINE_EXECUTION_CONTRACT');
assert.equal(policy?.humanDocumentRequired,false);
assert.equal(policy?.canonicalRecordPath,'games[].canonical');
assert.equal(policy?.rules?.canonicalFirst,true);
assert.equal(policy?.rules?.legacyFlatFields,'COMPATIBILITY_MIRROR_ONLY');
assert.equal(policy?.rules?.duplicateGameIdsForbidden,true);
assert.equal(policy?.rules?.duplicateVerifiedRobloxPlaceIdsForbidden,true);
assert.equal(policy?.homepageBinding?.presentationFrom,'canonical.homepage');
assert.equal(policy?.ordering?.mode,'CANONICAL_STABLE');
assert.equal(policy?.ordering?.outputField,'catalogOrder');
assert.equal(policy?.homepageBinding?.canonicalOrderField,'catalogOrder');
assert.equal(policy?.homepageBinding?.independentManualOrderingForbidden,true);
assert.equal(policy?.homepageBinding?.shelves?.RELEASE_CONFIRMED,'CATALOG_ORDER_ASC');
assert.equal(policy?.homepageBinding?.shelves?.WEB_PUBLISHED,'CATALOG_ORDER_ASC_UNBOUNDED');
assert.equal(policy?.homepageBinding?.shelves?.ROBLOX_HISTORICAL_DEPLOYMENT,'CATALOG_ORDER_ASC');
assert.equal(policy?.homepageBinding?.shelves?.DEVELOPMENT_CONFIRMED,'CURRENT_SCORE_DESC_THEN_CATALOG_ORDER_ASC');
assert.equal(Object.hasOwn(policy?.homepageBinding?.shelves||{},'TOP30'),false);
assert.equal(policy?.execution?.newPipelineForbidden,true);
assert.equal(policy?.execution?.shadowCatalogForbidden,true);

const auto=policy?.autoClassification||{};
assert.equal(auto.authority,'MACHINE_EXECUTION_CONTRACT');
assert.equal(auto.enabled,true);
assert.equal(auto.humanDocumentRequired,false);
assert.equal(auto.explicitOwnerOrCatalogValueWins,true);
assert.equal(auto.overwriteExplicitValue,false);
assert.equal(auto.executionPath,'tools/game-catalog-normalization.mjs inside existing company-status-sync');
assert.equal(auto.platform?.centralDefault,'ROBLOX');
assert.equal(auto.genre?.minimumLabels,1);

const inferredRpg={
  id:'auto-rpg',
  name:'3D 던전 퀘스트',
  description:'모바일 3D RPG에서 던전을 탐험하고 보스와 전투한다.',
  webPath:'/web-games/auto-rpg/',
  hasWebArchive:true,
  homepageWebPlayable:true,
  homepageInfo:{}
};
assert.equal(inferHomepagePlatform(inferredRpg),'UNITY');
assert(inferHomepageGenres(inferredRpg).includes('RPG'));
applyHomepageAutoClassification(inferredRpg);
assert.equal(inferredRpg.selectedPlatform,'UNITY');
assert.equal(inferredRpg.homepageInfo.platform,'UNITY');
assert(inferredRpg.genre.includes('RPG'));
assert.equal(inferredRpg.homepageInfo.genreLabel,inferredRpg.genre.join(' · '));

const inferredSocial={
  id:'auto-social',
  name:'친구들과 파티 타이쿤',
  description:'소셜 파티와 타이쿤 경영을 함께 즐기는 웹게임',
  hasWebArchive:true,
  homepageWebPlayable:true,
  homepageInfo:{}
};
assert.equal(inferHomepagePlatform(inferredSocial),'ROBLOX');

const inferredUefn={
  id:'auto-uefn',
  name:'배틀 로얄 아일랜드',
  description:'battle royale island combat',
  hasWebArchive:true,
  homepageWebPlayable:true,
  homepageInfo:{}
};
assert.equal(inferHomepagePlatform(inferredUefn),'FORTNITE_UEFN');

const explicit={
  id:'explicit-owner',
  name:'사용자 지정',
  description:'3D 모바일 RPG',
  webPath:'/web-games/explicit-owner/',
  hasWebArchive:true,
  selectedPlatform:'ROBLOX',
  genre:['경영'],
  homepageInfo:{platform:'ROBLOX',genre:['경영'],genreLabel:'경영'}
};
applyHomepageAutoClassification(explicit);
assert.equal(explicit.selectedPlatform,'ROBLOX');
assert.deepEqual(explicit.genre,['경영']);
assert.deepEqual(explicit.homepageInfo.genre,['경영']);

const ingestPolicy=policy?.ownerWebAutoIngest||{};
assert.equal(ingestPolicy.enabled,true);
assert.equal(ingestPolicy.root,'web-games');
assert.equal(ingestPolicy.requiredEntryFile,'index.html');
assert.equal(ingestPolicy.missingCatalogAction,'CREATE_DESIGN_ONLY_WEB_PUBLISHED_RECORD');
assert.equal(ingestPolicy.reconcileExistingCatalogGamesEveryStatusSync,true);
assert.equal(ingestPolicy.existingCanonicalIndexEnablesWebPlay,false);
assert.equal(ingestPolicy.missingCanonicalIndexDoesNotCreateVisibleTitleOnlyCard,true);

{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'owner-web-ingest-'));
  try{
    const dir=path.join(root,'owner-upload');
    fs.mkdirSync(dir,{recursive:true});
    fs.writeFileSync(path.join(dir,'index.html'),'<!doctype html><title>Owner Upload Game</title><main>'+('x'.repeat(700))+'</main>');
    const temp={games:[{id:'owner-upload',homepageWebPlayable:true,hasWebArchive:true,webPath:'/web-games/owner-upload/'}],permanentRemovalPolicy:{ids:[]}};
    const first=ingestOwnerWebGameIds(temp,['owner-upload'],{filesystem:fs,rootDir:root});
    assert.deepEqual(first.added,[]);
    assert.deepEqual(first.disabled,['owner-upload']);
    assert.equal(temp.games[0].homepageWebPlayable,false);
    assert.equal(temp.games[0].hasWebArchive,true,'keep legacy reference without exposing it');
    assert.equal(temp.games[0].ownerWebSourceState,'UNITY_WEB_VERIFICATION_REQUIRED',
      'legacy HTML remains an archive and cannot claim verified Unity WebGL playability');
    assert.equal(temp.games[0].webPath,'/web-games/owner-upload/');
  }finally{fs.rmSync(root,{recursive:true,force:true});}
}

assert.match(sync,/const actualWebPlayableReconciled=\[\.\.\.ownerWebIngest\.added,\.\.\.ownerWebIngest\.updated\]/);
assert.doesNotMatch(sync,/game\.homepageWebPlayable=true/,'status reconciliation must not bypass prototype withdrawal');
assert.match(sync,/COMPANY_ACTUAL_WEB_PLAYABLE_RECONCILED/);
assert.match(sync,/normalizeCatalog\(catalog\)/);
assert.match(sync,/validateNormalizedCatalog\(catalog\)/);
assert.match(homepage,/const canonicalOf=row=>/);
assert.match(homepage,/const identityOf=row=>/);
assert.match(homepage,/const publicationOf=row=>/);
assert.match(homepage,/const homepageOf=row=>/);
assert.match(homepage,/homepageOf\(row\)\.runtime/);
assert.match(homepage,/const catalogOrderCompare=/);
assert.match(homepage,/\.sort\(catalogOrderCompare\)/);
assert.match(manager,/canonicalOrderValid/);
assert.match(manager,/normalizedCatalogContract/);
assert.match(manager,/homepageCanonicalRenderer/);
assert.equal(fs.existsSync('tools/game-catalog-normalize.mjs'),false);
assert.equal(fs.existsSync('company-learning/catalog-homepage-normalization.json'),false);

console.log('PASS canonical catalog normalization + stable homepage order: games='+catalog.games.length);

{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'all-web-access-'));
  try{
    const write=(id,html)=>{fs.mkdirSync(path.join(root,id),{recursive:true});fs.writeFileSync(path.join(root,id,'index.html'),html+'<!--'+' '.repeat(600)+'-->');};
    write('owner-unregistered','<title>주인 게임</title><canvas></canvas>');
    write('simple-shell','<title>Approved Web Bootstrap</title><button>Win</button>');
    write('counter-shell','<title>카운터</title><script src="/web-games/_shared/vibe2-final.js?v=1"></script>');
    write('vibe-maker','<title>게임 제작기</title>');
    const temp={games:[
      {id:'simple-shell',webPath:'/web-games/simple-shell/',homepageWebPlayable:true,hasWebArchive:true},
      {id:'missing-entry',webPath:'/web-games/missing-entry/',homepageWebPlayable:true,hasWebArchive:true},
      {id:'unity-only-index',webPath:'/web-games/unity-only-index/',homepageWebPlayable:false,hasWebArchive:false}
    ],permanentRemovalPolicy:{ids:['removed']}};
    write('removed','<title>이전 삭제 게임</title>');
    const result=ingestOwnerWebGameIds(temp,[],{rootDir:root});
    assert.deepEqual(result.added,[],'HTML files alone may not auto-register games');
    assert.equal(temp.games.find(x=>x.id==='simple-shell').homepageWebPlayable,false);
    assert.equal(temp.games.find(x=>x.id==='simple-shell').ownerWebSourceState,'WITHDRAWN_SIMPLE_PROTOTYPE');
    assert.equal(temp.games.find(x=>x.id==='missing-entry').homepageWebPlayable,false);
    assert(!temp.games.some(x=>['counter-shell','vibe-maker','removed','owner-unregistered'].includes(x.id)));
    write('unity-only-index','<title>Unity Web Player</title><script>createUnityInstance(document.getElementById("unity-canvas"),{});</script>');
    const unity=path.join(root,'unity-only-index');
    const group={loader:['Build/game.loader.js'],data:['Build/game.data'],framework:['Build/game.framework.js'],wasm:['Build/game.wasm']};
    fs.mkdirSync(path.join(unity,'Build'));
    for(const files of Object.values(group))for(const file of files)fs.writeFileSync(path.join(unity,file),'bundle-fixture');
    ingestOwnerWebGameIds(temp,[],{rootDir:root});
    assert.equal(temp.games.find(x=>x.id==='unity-only-index').homepageWebPlayable,false,'bundle alone cannot bypass QA');
    fs.writeFileSync(path.join(unity,'unity-web-deploy-manifest.json'),JSON.stringify({engine:'UNITY_WEB',gameId:'unity-only-index',bundleComplete:true,requiredGroups:group}));
    const qa={pass:true,spatialGameplay:{pass:true,requiredDimension:'3D'},visualQa:{nativeUnityMesh:{pass:true}},mobile:{pass:true}};
    for(const name of ['unity-web-gameplay-validation.json','unity-web-independent-qa.json','unity-web-regression.json'])fs.writeFileSync(path.join(unity,name),JSON.stringify(qa));
    fs.writeFileSync(path.join(unity,'upper-platform-development-readiness.json'),JSON.stringify({gameId:'unity-only-index',state:'UPPER_PLATFORM_DEVELOPMENT_READY',pass:true}));
    ingestOwnerWebGameIds(temp,[],{rootDir:root});
    assert.equal(temp.games.find(x=>x.id==='unity-only-index').homepageWebPlayable,true);
    assert.equal(temp.games.find(x=>x.id==='unity-only-index').ownerWebSourceState,'UNITY_WEB_VERIFIED');
    write('simple-shell','<title>이전 일반 웹</title><canvas id="game"></canvas><script>function move(){};</script>');
    ingestOwnerWebGameIds(temp,[],{rootDir:root});
    assert.equal(temp.games.find(x=>x.id==='simple-shell').homepageWebPlayable,false);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
}

// Regression: a shared click-only genre control shell is not a playable game even if its HTML is long.
{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'click-only-web-'));
  try{
    const id='click-only-genre-shell';
    const dir=path.join(root,id);
    fs.mkdirSync(dir,{recursive:true});
    const shell='<!doctype html><title>버튼형 가짜 게임</title><script>window.GAME_CONFIG={};window.GAME_CONFIG.validationScopes=[];const C=window.GAME_CONFIG;const scopes=Array.isArray(C.validationScopes)?C.validationScopes.slice(0,5):[];function renderSurvival(){}function renderDefense(){}function renderPuzzle(){}</script>';
    fs.writeFileSync(path.join(dir,'index.html'),shell+' '.repeat(600));
    const catalogFixture={games:[{id,webPath:'/web-games/'+id+'/',homepageWebPlayable:true,hasWebArchive:true}],permanentRemovalPolicy:{ids:[]}};
    const outcome=ingestOwnerWebGameIds(catalogFixture,[],{rootDir:root});
    assert(outcome.disabled.includes(id));
    assert.equal(catalogFixture.games[0].homepageWebPlayable,false);
    assert.equal(catalogFixture.games[0].hasWebArchive,false);
    assert.equal(catalogFixture.games[0].ownerWebSourceState,'WITHDRAWN_SIMPLE_PROTOTYPE');
    fs.writeFileSync(path.join(dir,'index.html'),shell.replace('<script>','<canvas></canvas><script>'));
    ingestOwnerWebGameIds(catalogFixture,[],{rootDir:root});
    assert.equal(catalogFixture.games[0].homepageWebPlayable,false,'a decorative canvas must not turn a click-only shell into a game');
    const dedicated='<!doctype html><title>실제 월드 게임</title><canvas id="game"></canvas><script>const canvas=document.getElementById("game"),ctx=canvas.getContext("2d");const player={x:10,y:10,hp:100};function move(dx,dy){player.x+=dx;player.y+=dy;}function loop(){ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillRect(player.x,player.y,16,16);requestAnimationFrame(loop);}requestAnimationFrame(loop);</script>';
    fs.writeFileSync(path.join(dir,'index.html'),dedicated+' '.repeat(600));
    ingestOwnerWebGameIds(catalogFixture,[],{rootDir:root});
    assert.equal(catalogFixture.games[0].homepageWebPlayable,false,'legacy HTML cannot reenter without a verified Unity WebGL build');
  }finally{fs.rmSync(root,{recursive:true,force:true});}
}

{
  const source=fs.readFileSync('_worker.js','utf8');
  const edge=await import('data:text/javascript;base64,'+Buffer.from(source+'\nexport {mergeRuntimeCatalog};').toString('base64'));
  const runtime={games:[{id:'old',productionClass:'DEVELOPMENT_CONFIRMED',homepageWebPlayable:true,hasWebArchive:true,canonical:{sources:{web:{playable:true,archive:true}}}}]};
  const deployed={webExposurePolicy:ingestPolicy.webExposureQuality,games:[{id:'old',homepageWebPlayable:false,hasWebArchive:false,ownerWebSourceState:'WITHDRAWN_SIMPLE_PROTOTYPE',canonical:{sources:{web:{playable:false,archive:false,state:'WITHDRAWN_SIMPLE_PROTOTYPE'}}}},{id:'new-owner',homepageWebPlayable:true,hasWebArchive:true,webPath:'/web-games/new-owner/'}]};
  const merged=edge.mergeRuntimeCatalog(runtime,{}, {},{},deployed);
  assert.equal(merged.games.length,2);
  assert.equal(merged.games.find(x=>x.id==='old').homepageWebPlayable,false);
  assert.equal(merged.games.find(x=>x.id==='old').canonical.sources.web.playable,false);
  assert.equal(merged.games.find(x=>x.id==='old').productionClass,'DEVELOPMENT_CONFIRMED');
  assert.equal(merged.games.find(x=>x.id==='new-owner').homepageWebPlayable,true);
  const env={ASSETS:{fetch:async request=>new URL(request.url).pathname==='/game-catalog.json'?Response.json(deployed):new Response('<title>Approved Web Bootstrap</title><body><button>Win</button></body>',{headers:{'Content-Type':'text/html'}})}};
  const response=await edge.default.fetch(new Request('https://example.test/web-games/old/'),env);
  assert.equal(response.status,410);
  assert(!(await response.text()).includes('<button>Win</button>'));
}

{
  const context=vm.createContext({document:{readyState:'loading',addEventListener(){}},console,URL});
  vm.runInContext(homepage,context);
  const links=vm.runInContext(`internalReleaseLinks(bindVerifiedUnityBuild({id:'native-test'},{testBuilds:[{gameId:'native-test',download:'https://example.test/verified.apk',status:'ready',mobileReady:true,signatureVerified:true,installAndLaunchVerified:true}]}))`,context);
  assert.equal(links.unity,'https://example.test/verified.apk');
  assert.equal(vm.runInContext("hasInternalRelease({id:'native-test',unityBuildVerified:true})",context),false);
  assert.equal(vm.runInContext("internalReleaseLinks({id:'native-test',unityBuildUrl:'https://example.test/unverified.apk'}).unity",context),'');
  assert.equal(vm.runInContext("playableWebHref({id:'old',homepageWebPlayable:true,hasWebArchive:true,webPath:'/web-games/old/',ownerWebSourceState:'WITHDRAWN_SIMPLE_PROTOTYPE'})",context),'');
  vm.runInContext('platformExposure={unityWebEnabled:true,games:[]}',context);
  const visible=vm.runInContext(`developmentRows({games:[
    {id:'click-only',productionClass:'DEVELOPMENT_CONFIRMED',lifecycleState:'ACTIVE',homepageWebPlayable:true,hasWebArchive:true,webPath:'/web-games/click-only/',ownerWebSourceState:'WITHDRAWN_SIMPLE_PROTOTYPE'},
    {id:'no-build',productionClass:'DEVELOPMENT_CONFIRMED',lifecycleState:'ACTIVE'},
    {id:'dev-playable',productionClass:'DEVELOPMENT_CONFIRMED',lifecycleState:'ACTIVE',homepageWebPlayable:true,hasWebArchive:true,webPath:'/web-games/dev-playable/'},
    {id:'design-playable',productionClass:'DESIGN_ONLY',lifecycleState:'ACTIVE',homepageWebPlayable:true,hasWebArchive:true,webPath:'/web-games/design-playable/'},
    {id:'verified-unity',productionClass:'DEVELOPMENT_CONFIRMED',lifecycleState:'ACTIVE',unityWebAvailable:true,unityWebTestUrl:'/web-games/verified-unity/'}
  ]},{testBuilds:[]}).map(gameIdOf)`,context);
  assert.deepEqual([...visible].sort(),['design-playable','dev-playable','no-build','verified-unity'],
    'real game cards stay visible before QA, but click-only control shells stay excluded');
  assert.equal(vm.runInContext("internalReleaseLinks({id:'no-build'}).unityWeb",context),'',
    'visible game card must not create a non-existent Unity Web link');
  assert.equal(vm.runInContext("internalReleaseLinks({id:'verified-unity',unityWebAvailable:true,unityWebTestUrl:'/web-games/verified-unity/'}).unityWeb",context),'/web-games/verified-unity/',
    'verified Unity Web game keeps its playable link');
}
console.log('PASS owner discovery, prototype withdrawal, deployed runtime reconciliation and verified Unity test access');


{
  const temp={
    games:[{
      id:'legacy-freeze-game',
      name:'Legacy Freeze',
      productionClass:'DEVELOPMENT_CONFIRMED',
      lifecycleState:'ACTIVE',
      selectedPlatform:'ROBLOX',
      newFeatureExpansionFrozen:true,
      homepageInfo:{authority:'company-runtime',productionClass:'DEVELOPMENT_CONFIRMED'}
    }]
  };
  normalizeCatalog(temp);
  assert.equal(Object.hasOwn(temp.games[0],'newFeatureExpansionFrozen'),false);
  assert.equal(temp.normalization.automaticFeatureExpansionFreezeForbidden,true);
  assert.equal(validateNormalizedCatalog(temp).pass,true);
}

assert.equal(roadmap.studioQualityEvolution?.parallelExecution?.automaticFeatureExpansionFreezeForbidden,true);

// Cover bytes, titles and per-game typography must survive the canonical/runtime merge.
{
  const manifest=JSON.parse(fs.readFileSync('assets/homepage-covers/manifest.json','utf8'));
  const entries=Object.values(manifest.games);
  assert(entries.length>0);
  assert.equal(new Set(entries.map(x=>x.typography)).size,entries.length,'each cover has its own title lettering');
  for(const row of entries){
    assert(validatedHomepageMedia(row.gameId,row),'valid cover rejected: '+row.gameId);
    for(const [kind,limit] of [['small',40960],['cover',143360]]){
      const bytes=fs.readFileSync(row[kind].src);
      assert(bytes.length<=limit);
      assert.equal(bytes.toString('ascii',0,4),'RIFF');
      assert.equal(bytes.toString('ascii',8,12),'WEBP');
    }
    assert.equal(validatedHomepageMedia(row.gameId,{...row,gameId:'unrelated-game'}),null);
    assert.equal(validatedHomepageMedia(row.gameId,{...row,small:{...row.small,sha256:'0'.repeat(64)}}),null);
    assert.equal(validatedHomepageMedia(row.gameId,{...row,small:{...row.small,src:'../outside.webp'}}),null);
    assert.equal(validatedHomepageMedia(row.gameId,{...row,small:{...row.small,bytes:row.small.bytes+1}}),null);
  }
  const row=entries[0];
  const normalized={games:[{id:row.gameId,name:'native name',productionClass:'DEVELOPMENT_CONFIRMED',marketingThumbnail:'assets/native-unchanged.webp'}]};
  normalizeCatalog(normalized);
  assert.equal(normalized.games[0].canonical.marketing.homepageMedia.titleEn,row.titleEn);
  assert.equal(normalized.games[0].canonical.marketing.thumbnail,'assets/native-unchanged.webp');
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'homepage-video-binding-'));
  try{
    const root=path.join(temp,'web-games',row.gameId);fs.mkdirSync(root,{recursive:true});
    fs.writeFileSync(path.join(root,'index.html'),'<canvas>source revision one</canvas>');
    for(const asset of [row.small,row.cover]){const dest=path.join(temp,asset.src);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(asset.src,dest);}
    const bytes=Buffer.from('fixture: only metadata binding is exercised here');
    const src=`assets/homepage-media/${row.gameId}.mp4`;
    fs.mkdirSync(path.join(temp,'assets/homepage-media'),{recursive:true});fs.writeFileSync(path.join(temp,src),bytes);
    const video={gameId:row.gameId,platform:'WEB',sourceRevision:'a'.repeat(40),artifactIdentity:webTreeFingerprint(fs,root),capturedAt:'2026-10-05T00:00:00Z',src,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),dependencies:[{path:`web-games/${row.gameId}/index.html`,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'index.html'))).digest('hex')}],runtimeVerification:{pass:true,inputEvents:2,visualChangeObserved:true}};
    assert(validatedHomepageMedia(row.gameId,{...row,video},{root:temp}).video);
    assert(!validatedHomepageMedia(row.gameId,{...row,video:{...video,platform:'ROBLOX'}},{root:temp}).video,'web capture cannot claim Roblox native footage');
    fs.appendFileSync(path.join(root,'index.html'),'changed source');
    assert(!validatedHomepageMedia(row.gameId,{...row,video},{root:temp}).video,'stale capture cannot follow a changed runtime');
  }finally{fs.rmSync(temp,{recursive:true,force:true});}
  assert(homepage.includes('preload="none"'));
  assert(homepage.includes('data-src='));
}

// Withdraw only the audited simple implementations; unrelated/native targets remain intact.
{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'homepage-simple-click-'));
  try{
    const blocked=roadmap.catalogNormalization.ownerWebAutoIngest.webExposureQuality.withdrawnEntrySha256;
    for(const id of Object.keys(blocked)){
      fs.mkdirSync(path.join(root,id),{recursive:true});
      fs.copyFileSync(`web-games/${id}/index.html`,path.join(root,id,'index.html'));
    }
    const fixture={games:Object.keys(blocked).map(id=>({id,name:id,productionClass:'DEVELOPMENT_CONFIRMED',homepageWebPlayable:true,hasWebArchive:true,robloxUrl:'https://www.roblox.com/games/12345'}))};
    ingestOwnerWebGameIds(fixture,[],{rootDir:root});
    for(const game of fixture.games){assert.equal(game.homepageWebPlayable,false);assert.equal(game.robloxUrl,'https://www.roblox.com/games/12345');}
    const workerSource=fs.readFileSync('_worker.js','utf8');
    const edge=await import('data:text/javascript;base64,'+Buffer.from(workerSource).toString('base64'));
    for(const id of Object.keys(blocked)){
      const html=fs.readFileSync(`web-games/${id}/index.html`,'utf8').trim();
      const env={ASSETS:{fetch:async request=>new URL(request.url).pathname==='/game-catalog.json'?Response.json({webExposurePolicy:roadmap.catalogNormalization.ownerWebAutoIngest.webExposureQuality,games:[]}):new Response(html,{headers:{'Content-Type':'text/html'}})}};
      const response=await edge.default.fetch(new Request(`https://example.test/web-games/${id}/`),env);
      assert.equal(response.status,410,id+' direct route must be withdrawn');
    }
  }finally{fs.rmSync(root,{recursive:true,force:true});}
}
console.log('PASS compact unique typography covers, media integrity/source binding, lazy video and four audited click-only withdrawals');
