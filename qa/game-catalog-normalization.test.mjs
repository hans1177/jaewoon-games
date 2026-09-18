import assert from 'node:assert/strict';
import fs from 'node:fs';
import { validateNormalizedCatalog } from '../tools/game-catalog-normalization.mjs';

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

const skyline=catalog.games.find(game=>game.id==='seed-roblox-obby-party-minigam-tower-of-hell');
const vector=catalog.games.find(game=>game.id==='seed-roblox-battleground-fight-welcome-to-bloxburg');
assert(skyline&&vector);
assert.equal(skyline.canonical.identity.name,'Skyline Rush');
assert.equal(skyline.canonical.publication.roblox.placeId,'129342889720619');
assert.equal(vector.canonical.publication.roblox.placeId,'120787429678729');
assert.notEqual(skyline.canonical.publication.roblox.placeId,vector.canonical.publication.roblox.placeId);
assert.notEqual(skyline.canonical.publication.roblox.universeId,vector.canonical.publication.roblox.universeId);

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
