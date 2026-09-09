// 파일명: qa/artbook-tier3-style-depth.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const catalog=JSON.parse(fs.readFileSync('game-catalog.json','utf8'));
const profiles=JSON.parse(fs.readFileSync('artbook-style-profiles.json','utf8'));

test('all catalog design-only games have deep game-specific artbook profiles',()=>{
  const tier3=(catalog.games||[]).filter(game=>game.productionTier===3||game.homepageCategory==='design-only');
  assert.ok(tier3.length>=1,'design-only games missing');
  for(const game of tier3){
    const profile=profiles.games?.[game.id];
    assert.ok(profile,`${game.id}: style profile missing`);
    assert.ok(String(profile.identity||'').length>=20,`${game.id}: identity too shallow`);
    assert.ok(String(profile.storyFocus||'').length>=80,`${game.id}: storyFocus too shallow`);
    assert.ok(Array.isArray(profile.visualLanguage)&&profile.visualLanguage.length>=6,`${game.id}: visualLanguage too shallow`);
    assert.ok(Array.isArray(profile.signatureSections)&&profile.signatureSections.length>=7,`${game.id}: signatureSections too shallow`);
    assert.equal(new Set(profile.signatureSections).size,profile.signatureSections.length,`${game.id}: repeated signature sections`);
  }
});
