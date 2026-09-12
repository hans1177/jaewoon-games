import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateGameSeed} from '../tools/company-game-seed-contract.mjs';
import {loadPlatformProfiles,representativeCategoriesForPlatform} from '../tools/game-seed-platform-profile.mjs';

const directive=JSON.parse(fs.readFileSync('company-directive.json','utf8'));
const portfolio=JSON.parse(fs.readFileSync('autonomous-portfolio.json','utf8'));
const profiles=loadPlatformProfiles('game-seed-platform-profiles.json');
const expected=[
  'ROLEPLAY_LIFE_AVATAR',
  'SIMULATOR_TYCOON_INCREMENTAL',
  'BATTLEGROUND_FIGHTING_SHOOTER',
  'SURVIVAL_HORROR_ESCAPE',
  'OBBY_PARTY_MINIGAME',
  'STORY_RPG_ADVENTURE_RPG',
];

test('Roblox profile defines exactly six independent representative categories including Story RPG',()=>{
  const categories=representativeCategoriesForPlatform(directive,'ROBLOX',profiles);
  assert.deepEqual(categories,expected);
  assert.equal(new Set(categories).size,6);
  assert.ok(categories.includes('STORY_RPG_ADVENTURE_RPG'));
  assert.deepEqual(new Set(Object.keys(profiles.platforms.ROBLOX.categories)),new Set(expected));
});

test('historical Unity bootstrap remains independent from Roblox representative profile',()=>{
  assert.equal(directive.gameSeed.bootstrap.historicalInitialSeedBatchOnly,true);
  assert.equal(directive.gameSeed.bootstrap.productionQuota,false);
  assert.equal(directive.gameSeed.bootstrap.count,6);
  assert.equal(directive.gameSeed.initialTargetPlatform,'ROBLOX');
  assert.notDeepEqual(new Set(directive.gameSeed.bootstrap.categories),new Set(expected));
});

test('live implementation focus allows two to three games without becoming a portfolio cap',()=>{
  assert.equal(portfolio.fixedProjectCount,false);
  assert.equal(portfolio.developmentFocusPolicy.targetFocusedGames,2);
  assert.equal(portfolio.developmentFocusPolicy.maxFocusedGames,3);
  assert.equal(portfolio.developmentFocusPolicy.focusedGameCountIsWipGuidanceNotPortfolioCap,true);
  assert.equal(portfolio.productionClassPolicy.classes.RELEASE_CONFIRMED.deepFocusSlots,3);
  assert.equal(portfolio.productionClassPolicy.classes.RELEASE_CONFIRMED.deepFocusSlotsAreWipGuidanceNotPortfolioCap,true);
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
