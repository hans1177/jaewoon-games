import assert from 'node:assert/strict';
import fs from 'node:fs';
import { applyHomepageAutoClassification, inferHomepageGenres, inferHomepagePlatform, validateNormalizedCatalog } from '../tools/game-catalog-normalization.mjs';

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
assert.equal(policy?.homepageBinding?.shelves?.WEB_PUBLISHED,'CATALOG_ORDER_ASC');
assert.equal(policy?.homepageBinding?.shelves?.ROBLOX_HISTORICAL_DEPLOYMENT,'CATALOG_ORDER_ASC');
assert.equal(policy?.homepageBinding?.shelves?.DEVELOPMENT_CONFIRMED,'CURRENT_SCORE_DESC_THEN_CATALOG_ORDER_ASC');
assert.equal(policy?.homepageBinding?.shelves?.TOP30,'STRICT_IMPLEMENTATION_SCORE_DESC');
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
