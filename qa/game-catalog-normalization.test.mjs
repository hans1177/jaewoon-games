import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { applyHomepageAutoClassification, inferHomepageGenres, inferHomepagePlatform, ingestOwnerWebGameIds, normalizeCatalog, validateNormalizedCatalog } from '../tools/game-catalog-normalization.mjs';

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

{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'owner-web-ingest-'));
  try{
    const dir=path.join(root,'owner-upload');
    fs.mkdirSync(dir,{recursive:true});
    fs.writeFileSync(path.join(dir,'index.html'),'<!doctype html><title>Owner Upload Game</title><main>'+('x'.repeat(700))+'</main>');
    fs.writeFileSync(path.join(dir,'game.js'),'window.ownerUpload=1;');
    const temp={games:[],permanentRemovalPolicy:{ids:[]}};
    const first=ingestOwnerWebGameIds(temp,['owner-upload'],{filesystem:fs,rootDir:root});
    assert.deepEqual(first.added,['owner-upload']);
    const game=temp.games[0];
    assert.equal(game.id,'owner-upload');
    assert.equal(game.name,'Owner Upload Game');
    assert.equal(game.webPath,'/web-games/owner-upload/');
    assert.equal(game.hasWebArchive,true);
    assert.equal(game.homepageWebPlayable,true);
    assert.equal(game.productionClass,'DESIGN_ONLY');
    assert.equal(game.homepageDisplayMode,'WEB_PUBLISHED');
    assert.match(game.ownerWebSourceRevision,/^[a-f0-9]{64}$/);
    const firstRevision=game.ownerWebSourceRevision;
    fs.writeFileSync(path.join(dir,'game.js'),'window.ownerUpload=2;');
    const second=ingestOwnerWebGameIds(temp,['owner-upload'],{filesystem:fs,rootDir:root});
    assert.deepEqual(second.updated,['owner-upload']);
    assert.notEqual(game.ownerWebSourceRevision,firstRevision);
    assert.equal(game.webDevelopmentResetRequired,true);
    assert.equal(game.ownerWebEntryFile,'web-games/owner-upload/index.html');
  }finally{fs.rmSync(root,{recursive:true,force:true});}
}

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


test('canonical marketing images drive both homepage cards and Roblox thumbnail source',()=>{
  const targets=['cozy-island','daechung-rpg','horror-escape-room','village-dungeons'];
  const images=new Set();
  for(const gameId of targets){
    const game=catalog.games.find(row=>row.id===gameId);
    assert(game,'missing '+gameId);
    assert.match(game.marketingImage,new RegExp('^assets/roblox-thumbnails/'+gameId+'\\\\.svg$'));
    assert.equal(game.image,game.marketingImage);
    assert.equal(game.canonical.identity.image,game.marketingImage);
    assert.equal(game.canonical.identity.marketingImage,game.marketingImage);
    assert.equal(fs.existsSync(game.marketingImage),true,'missing marketing image '+game.marketingImage);
    assert.equal(images.has(game.marketingImage),false,'duplicate marketing image '+game.marketingImage);
    images.add(game.marketingImage);
  }
  assert.match(manager,/homepageMarketingImageSync/);
  assert.match(manager,/HOMEPAGE_MARKETING_IMAGE_SYNC=/);
});
