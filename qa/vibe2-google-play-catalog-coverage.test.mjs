import assert from 'node:assert/strict';
import fs from 'node:fs';

const catalog=JSON.parse(fs.readFileSync('company-learning/external-game-playtest/mobile-free-seed-games.json','utf8'));
const distill=fs.readFileSync('tools/vibe2-external-gameplay-distill.mjs','utf8');
const playtest=fs.readFileSync('tools/external-mobile-free-playtest.ps1','utf8');

const lessonCategories=new Set([...distill.matchAll(/^  ([A-Z0-9_]+): \{$/gm)].map(match=>match[1]));
const catalogCategories=new Set((catalog.games||[]).map(game=>game.category));
const missingCategories=[...catalogCategories].filter(category=>!lessonCategories.has(category)).sort();
assert.deepEqual(missingCategories,[],'every Google Play catalog category must have a distillation lesson');

const profiles=new Set((catalog.games||[]).map(game=>game.inputProfile));
const missingProfiles=[...profiles].filter(profile=>!playtest.includes("'"+profile+"' {")).sort();
assert.deepEqual(missingProfiles,[],'every Google Play input profile must have a safe input handler');

assert((catalog.games||[]).length>=20,'Google Play rotating catalog should remain broad');
assert.equal(catalog.rotationPolicy?.wrapAround,true);
assert.equal(catalog.rotationPolicy?.continuousRefill,true);
assert.equal(catalog.learningPolicy?.transformativeReinterpretation,true);
assert.equal(catalog.learningPolicy?.rawSourceOutputAllowed,false);
assert.equal(catalog.learningPolicy?.rawAssetOutputAllowed,false);

console.log(`PASS Google Play catalog coverage games=${catalog.games.length} categories=${catalogCategories.size} profiles=${profiles.size}`);
