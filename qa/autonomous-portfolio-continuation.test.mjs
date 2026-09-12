import test from 'node:test';
import assert from 'node:assert/strict';
import {decidePortfolioContinuation} from '../tools/autonomous-portfolio-continuation.mjs';

const fsAll={existsSync:()=>true};
const categories=[
  'ROLEPLAY_LIFE_AVATAR',
  'SIMULATOR_TYCOON_INCREMENTAL',
  'BATTLEGROUND_FIGHTING_SHOOTER',
  'SURVIVAL_HORROR_ESCAPE',
  'OBBY_PARTY_MINIGAME',
  'STORY_RPG_ADVENTURE_RPG'
];
const directive={
  gameSeed:{initialTargetPlatform:'ROBLOX'},
  platformStrategy:{primaryPlatform:'ROBLOX'},
  platformPortfolioSets:{platformSets:{ROBLOX:{categories}}}
};
const portfolio={status:'ACTIVE',paidApi:false,maxAutonomousWorkItemsPerDay:8,projects:[{id:'P0001',sourcePath:'web-games/a',mode:'IMPROVE'},{id:'P0002',sourcePath:'web-games/b',mode:'EXPERIMENT_ONLY'},{id:'P0007',sourcePath:'web-games/hold',mode:'HOLD'}]};
const attempts=ids=>({attempts:ids.map(gameId=>({date:'2026-09-12',gameId}))});
const robloxSeed=category=>({seedId:`SEED-ROBLOX-${category}-001`,gameId:`g-${category}`,GAME_CATEGORY:category,INITIAL_TARGET_PLATFORM:'ROBLOX',status:'ACTIVE'});
const unityHistorical=category=>({seedId:`SEED-${category}-001`,gameId:`u-${category}`,GAME_CATEGORY:category,INITIAL_TARGET_PLATFORM:'UNITY',status:'ACTIVE',generation:'INITIAL_BOOTSTRAP'});
const seeded=(patch={})=>({version:1,bootstrapCompletedAt:'2026-09-11T00:00:00Z',categories:['ACTION_SURVIVAL_ROGUELITE'],seeds:categories.map(robloxSeed),vacancies:[],...patch});
const completeQueue=attempts(['P0001','P0002']);
const scores=value=>({planning:value,graphics:value,development:value,qa:value,balance:value});

test('remaining game work keeps portfolio in game queue',()=>{
  const d=decidePortfolioContinuation({portfolio,queueState:attempts(['P0001']),seedState:seeded(),directive,date:'2026-09-12',filesystem:fsAll});
  assert.equal(d.action,'WAIT_GAME_QUEUE');
  assert.deepEqual(d.remaining,['P0002']);
});

test('missing historical bootstrap dispatches GAME_SEED',()=>{
  const d=decidePortfolioContinuation({portfolio,queueState:completeQueue,seedState:{version:1,seeds:[],vacancies:[]},directive,date:'2026-09-12',filesystem:fsAll});
  assert.equal(d.action,'DISPATCH_GAME_SEED');
  assert.equal(d.reason,'HISTORICAL_INITIAL_SEED_BOOTSTRAP_REQUIRED');
  assert.equal(d.seedMode,'INITIAL_BOOTSTRAP');
});

test('historical Unity seeds do not satisfy independent Roblox representative set',()=>{
  const historicalCategories=['ACTION_SURVIVAL_ROGUELITE','SINGLE_DEFENSE_STRATEGY','PUZZLE','CASUAL','IDLE_GROWTH_RPG','STORY_COMPLETE_RPG'];
  const state={version:1,bootstrapCompletedAt:'2026-09-11T00:00:00Z',seeds:historicalCategories.map(unityHistorical),vacancies:[]};
  const d=decidePortfolioContinuation({portfolio,queueState:completeQueue,seedState:state,directive,date:'2026-09-12',filesystem:fsAll});
  assert.equal(d.action,'DISPATCH_GAME_SEED');
  assert.equal(d.reason,'PRIMARY_PLATFORM_REPRESENTATIVE_SET_GAP');
  assert.equal(d.seedMode,'PLATFORM_SET_FILL');
  assert.equal(d.platform,'ROBLOX');
  assert.deepEqual(d.categories,categories);
});

test('only missing Roblox representative category is dispatched',()=>{
  const missing='STORY_RPG_ADVENTURE_RPG';
  const state=seeded({seeds:categories.filter(x=>x!==missing).map(robloxSeed)});
  const d=decidePortfolioContinuation({portfolio,queueState:completeQueue,seedState:state,directive,date:'2026-09-12',filesystem:fsAll});
  assert.equal(d.seedMode,'PLATFORM_SET_FILL');
  assert.deepEqual(d.categories,[missing]);
});

test('vacancy dispatches dynamic replenishment after representative set is complete',()=>{
  const d=decidePortfolioContinuation({portfolio,queueState:completeQueue,seedState:seeded({vacancies:[{id:'VAC-00001',platform:'ROBLOX',category:'OBBY_PARTY_MINIGAME',reason:'DISCARDED',filledAt:null,replacementSeedId:null}]}),directive,date:'2026-09-12',filesystem:fsAll});
  assert.equal(d.action,'DISPATCH_GAME_SEED');
  assert.equal(d.seedMode,'DYNAMIC_REPLENISHMENT');
  assert.deepEqual(d.vacancies,[{id:'VAC-00001',platform:'ROBLOX',category:'OBBY_PARTY_MINIGAME',reason:'DISCARDED'}]);
});

test('complete set without five-department scores does not invent expansion',()=>{
  const d=decidePortfolioContinuation({portfolio,queueState:completeQueue,seedState:seeded(),directive,date:'2026-09-12',filesystem:fsAll});
  assert.equal(d.action,'STOP');
  assert.equal(d.reason,'PORTFOLIO_SCORE_EVIDENCE_REQUIRED');
});

test('60-79 five-department score maintains current portfolio',()=>{
  const p={...portfolio,departmentScores:scores(70)};
  const d=decidePortfolioContinuation({portfolio:p,queueState:completeQueue,seedState:seeded(),directive,date:'2026-09-12',filesystem:fsAll});
  assert.equal(d.action,'STOP');
  assert.equal(d.reason,'PORTFOLIO_MAINTAIN');
  assert.equal(d.portfolioScore,70);
});

test('80+ score requires concrete expansion target instead of arbitrary game creation',()=>{
  const p={...portfolio,departmentScores:scores(85)};
  const d=decidePortfolioContinuation({portfolio:p,queueState:completeQueue,seedState:seeded(),directive,date:'2026-09-12',filesystem:fsAll});
  assert.equal(d.action,'HOLD');
  assert.equal(d.reason,'EXPANSION_TARGET_EVIDENCE_REQUIRED');
});

test('80+ score plus explicit evidence target dispatches portfolio expansion beyond six',()=>{
  const p={...portfolio,departmentScores:scores(85),portfolioExpansionCandidate:{platform:'ROBLOX',category:'STORY_RPG_ADVENTURE_RPG',reason:'SECOND_STORY_RPG_CANDIDATE_HAS_DISTINCT_LOOP'}};
  const d=decidePortfolioContinuation({portfolio:p,queueState:completeQueue,seedState:seeded(),directive,date:'2026-09-12',filesystem:fsAll});
  assert.equal(d.action,'DISPATCH_GAME_SEED');
  assert.equal(d.reason,'FIVE_DEPARTMENT_SCORE_GUIDED_EXPANSION');
  assert.equal(d.seedMode,'PORTFOLIO_EXPANSION');
  assert.equal(d.expansionCandidate.category,'STORY_RPG_ADVENTURE_RPG');
});

test('daily development cap does not block mandatory representative gap or vacancy checks',()=>{
  const p={...portfolio,maxAutonomousWorkItemsPerDay:2};
  const missingState=seeded({seeds:categories.slice(0,5).map(robloxSeed)});
  const gap=decidePortfolioContinuation({portfolio:p,queueState:completeQueue,seedState:missingState,directive,date:'2026-09-12',filesystem:fsAll});
  assert.equal(gap.seedMode,'PLATFORM_SET_FILL');
  const vacancy=decidePortfolioContinuation({portfolio:p,queueState:completeQueue,seedState:seeded({vacancies:[{id:'VAC-00002',platform:'ROBLOX',category:'ROLEPLAY_LIFE_AVATAR',reason:'OWNER_REMOVED',filledAt:null,replacementSeedId:null}]}),directive,date:'2026-09-12',filesystem:fsAll});
  assert.equal(vacancy.seedMode,'DYNAMIC_REPLENISHMENT');
});
