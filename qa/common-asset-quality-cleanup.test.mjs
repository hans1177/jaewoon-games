import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));

test('all-game common materials keep static authoring scores separate from observed quality', () => {
  const q = read('assets/roblox/common-materials-v1/quality-evidence.json');
  const catalog = read('assets/roblox/common-materials-v1/catalog.json');
  assert.equal(q.companyCommonBase, true);
  assert.equal(q.productionVerified, false);
  assert.equal(catalog.productionVerified, false);
  assert.equal(q.staticAuthoringChecklist.scoreType, 'STATIC_AUTHORING_CHECKLIST_NOT_RUNTIME_QUALITY');
  assert.equal(q.quality120.claimedRuntimeScore, null);
  assert.ok(Array.isArray(q.sourceAudit.limitations));
  for (const gap of ['ACTUAL_GAME_LIGHTING_RESPONSE_UNVERIFIED', 'MOBILE_RUNTIME_COST_UNVERIFIED']) {
    assert.ok(q.sourceAudit.limitations.includes(gap), gap);
  }
});

test('curated common actor library excludes generic stand-ins without treating absence as low quality', () => {
  const actors = read('assets/roblox/actors/manifest.json');
  assert.equal(actors.productionVerified, false);
  assert.equal(actors.adaptedGlbCount, actors.models.length);
  assert.ok(actors.models.length > 0);
  const ids = new Set();
  for (const actor of actors.models) {
    assert.ok(actor.id && !ids.has(actor.id), 'unique actor identity');
    ids.add(actor.id);
    assert.ok(actor.path.startsWith('assets/roblox/actors/native/'));
    assert.ok(fs.existsSync(actor.path), 'missing actor source: ' + actor.path);
    assert.ok(actor.sha256 && /^[a-f0-9]{64}$/.test(actor.sha256), 'missing content provenance');
    assert.notEqual(actor.productionVerified, true, 'no unverified runtime PASS');
  }
});

test('cross-game auto-replacement is blocked without measured and runtime-verified candidate quality', () => {
  const source = fs.readFileSync('assets/vibe-studio-asset-universe.js', 'utf8');
  assert.match(source, /const replacementQualityVerified=Boolean\(best\?\.reuse\?\.qualityEvidenceGrounded/);
  assert.match(source, /usageByAsset\[text\(best\?\.asset\?\.id\)\]\?\.runtimePass===true/);
  assert.match(source, /replacementQualityVerified&&\s*gain>=INTERNAL_ASSET_REUSE_POLICY\.replacement\.minimumEffectiveGain/);
});

test('verified cross-game replacements outrank higher unverified asset scores', () => {
  const source = fs.readFileSync('assets/vibe-studio-asset-universe.js', 'utf8');
  assert.match(source, /const verifiedRows=rows\.filter\(row=>row\.reuse\.qualityEvidenceGrounded/);
  assert.match(source, /usageByAsset\[text\(row\.asset\?\.id\)\]\?\.runtimePass===true/);
  assert.match(source, /const best=locked\|\|\(currentAsset\?verifiedRows\[0\]\|\|rows\[0\]:rows\[0\]\)\|\|null/);
});

test('unverified advisory candidate cannot become automatic cross-game binding', () => {
  const source = fs.readFileSync('assets/vibe-studio-asset-universe.js', 'utf8');
  assert.match(source, /const automaticBindingAssetId=currentAsset/);
  assert.match(source, /replacementRecommended\?text\(best\?\.asset\?\.id\):text\(currentAsset\?\.id\)/);
  assert.match(source, /replacementQualityVerified\?text\(best\?\.asset\?\.id\):null/);
  assert.match(source, /automaticBindingAllowed=Boolean\(automaticBindingAssetId/);
});
