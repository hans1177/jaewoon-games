import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateGameSeed} from '../tools/company-game-seed-contract.mjs';

const flow=fs.readFileSync('COMPANY_FLOW.md','utf8');
const directive=JSON.parse(fs.readFileSync('company-directive.json','utf8'));
const roadmap=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
const portfolio=JSON.parse(fs.readFileSync('autonomous-portfolio.json','utf8'));
const profiles=JSON.parse(fs.readFileSync('game-seed-platform-profiles.json','utf8'));

const roblox=directive.platformPortfolioSets.platformSets.ROBLOX;

test('central policy and runtime mirrors agree on independent Roblox six-category set',()=>{
  assert.equal(roblox.representativeCategoryCount,6);
  assert.equal(roblox.categories.length,6);
  assert.equal(new Set(roblox.categories).size,6);
  assert.ok(roblox.categories.includes('STORY_RPG_ADVENTURE_RPG'));
  assert.deepEqual(roblox.requiredCategories,['STORY_RPG_ADVENTURE_RPG']);
  assert.equal(roblox.sixRepresentativesAreReleaseCandidatesNotGuaranteedReleases,true);
  assert.deepEqual(roadmap.platformPortfolioSets.roblox.categories,roblox.categories);
  assert.equal(roadmap.platformPortfolioSets.categorySlotsSharedAcrossPlatforms,false);
  assert.equal(roadmap.platformPortfolioSets.sixCategoriesAreDevelopmentSetNotPortfolioCap,true);
  assert.equal(roadmap.platformPortfolioSets.forcedReleaseOfAllSetMembers,false);
  assert.match(flow,/documentationSynchronization:/);
  assert.match(flow,/syncRelevantWorkDocumentsOnEveryPolicyChange: true/);
  assert.match(flow,/sixCategoriesAreDevelopmentSetNotPortfolioCap: true/);
  assert.match(flow,/STORY_RPG_ADVENTURE_RPG: REVISE_OR_RESEED_WITHIN_CATEGORY_IF_CANDIDATE_IS_EXCLUDED/);
});

test('live autonomous portfolio no longer locks implementation focus to one game',()=>{
  assert.equal(portfolio.fixedProjectCount,false);
  assert.equal(portfolio.developmentFocusPolicy.targetFocusedGames,2);
  assert.equal(portfolio.developmentFocusPolicy.maxFocusedGames,3);
  assert.equal(portfolio.developmentFocusPolicy.focusedGameCountIsWipGuidanceNotPortfolioCap,true);
  assert.equal(portfolio.productionClassPolicy.classes.RELEASE_CONFIRMED.deepFocusSlots,3);
  assert.equal(portfolio.productionClassPolicy.classes.RELEASE_CONFIRMED.deepFocusSlotsAreWipGuidanceNotPortfolioCap,true);
});

test('Roblox platform profile contains every representative category',()=>{
  assert.deepEqual(new Set(Object.keys(profiles.platforms.ROBLOX.categories)),new Set(roblox.categories));
});

test('GAME_SEED contract accepts Roblox and rejects stale Android-mobile platform',()=>{
  const base={
    GAME_CATEGORY:'STORY_RPG_ADVENTURE_RPG',
    REFERENCE_GAMES:['Blox Fruits'],
    CORE_FUN_TO_LEARN:['quest'],
    CORE_LOOP:['accept quest','fight boss','unlock area'],
    DISTINCT_IDENTITY:'Original distinct Roblox story RPG reinterpretation.',
    MARKET_EVIDENCE_SUMMARY:{role:'TARGET_DESIGN_REFERENCE'},
    TARGET_AUDIENCE:'Global Roblox players',
    TARGET_SESSION_DIRECTION:'Global Roblox session direction',
    INITIAL_PLAY_MODE:'PROJECT_DEFINED',
    CROSS_PLATFORM_EXPANSION_VALUE:'UNKNOWN_UNTIL_PLATFORM_EXPANSION_REVIEW'
  };
  assert.equal(validateGameSeed({...base,INITIAL_TARGET_PLATFORM:'ROBLOX'}).pass,true);
  const stale=validateGameSeed({...base,INITIAL_TARGET_PLATFORM:'ANDROID_MOBILE'});
  assert.equal(stale.pass,false);
  assert.ok(stale.errors.some(error=>error.includes('INITIAL_TARGET_PLATFORM must be one of')));
});
