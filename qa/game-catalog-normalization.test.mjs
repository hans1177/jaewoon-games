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
assert.equal(catalog.runtimeCounts?.normalizedGames,catalog.games.length);

for(const game of catalog.games){
  const c=game.canonical;
  assert(c,'canonical record missing: '+game.id);
  assert.equal(c.identity.gameId,game.id);
  assert.equal(c.production.class,String(game.productionClass||'DESIGN_ONLY').toUpperCase());
  assert.equal(c.lifecycle.state,String(game.lifecycleState||'ACTIVE').toUpperCase());
  assert.equal(c.homepage.runtime.authority,'company-runtime');
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
assert.equal(policy?.execution?.newPipelineForbidden,true);
assert.equal(policy?.execution?.shadowCatalogForbidden,true);

assert.match(sync,/normalizeCatalog\(catalog\)/);
assert.match(sync,/validateNormalizedCatalog\(catalog\)/);
assert.match(homepage,/const canonicalOf=row=>/);
assert.match(homepage,/const identityOf=row=>/);
assert.match(homepage,/const publicationOf=row=>/);
assert.match(homepage,/const homepageOf=row=>/);
assert.match(homepage,/homepageOf\(row\)\.runtime/);
assert.match(manager,/normalizedCatalogContract/);
assert.match(manager,/homepageCanonicalRenderer/);

console.log('PASS canonical catalog normalization: games='+catalog.games.length);
