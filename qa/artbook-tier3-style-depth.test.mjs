// 파일명: qa/artbook-tier3-style-depth.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const portfolio=JSON.parse(fs.readFileSync('autonomous-portfolio.json','utf8'));
const profiles=JSON.parse(fs.readFileSync('artbook-style-profiles.json','utf8'));

test('all portfolio design-only games have deep game-specific artbook profiles',()=>{
  const tier3=(portfolio.projects||[]).filter(game=>game.productionTier===3||game.profileStatus==='DESIGN_ONLY'||game.targetEngine==='design-only');
  assert.ok(tier3.length>=1,'design-only games missing');
  for(const game of tier3){
    const profile=profiles.games?.[game.slug];
    assert.ok(profile,`${game.id}/${game.slug}: style profile missing`);
    assert.ok(String(profile.identity||'').length>=20,`${game.slug}: identity too shallow`);
    assert.ok(String(profile.storyFocus||'').length>=80,`${game.slug}: storyFocus too shallow`);
    assert.ok(Array.isArray(profile.visualLanguage)&&profile.visualLanguage.length>=6,`${game.slug}: visualLanguage too shallow`);
    assert.ok(Array.isArray(profile.signatureSections)&&profile.signatureSections.length>=7,`${game.slug}: signatureSections too shallow`);
    assert.equal(new Set(profile.signatureSections).size,profile.signatureSections.length,`${game.slug}: repeated signature sections`);
  }
});
