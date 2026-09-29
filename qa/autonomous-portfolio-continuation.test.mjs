import test from 'node:test';
import assert from 'node:assert/strict';
import {decidePortfolioContinuation} from '../tools/autonomous-portfolio-continuation.mjs';
import {createPortfolioSeedRequest,normalizeSeedState,markSeedDiscarded} from '../tools/game-seed-state.mjs';

const ROBLOX_CATEGORIES=[
  'ROLEPLAY_LIFE_AVATAR',
  'SIMULATOR_TYCOON_INCREMENTAL',
  'BATTLEGROUND_FIGHTING_SHOOTER',
  'SURVIVAL_HORROR_ESCAPE',
  'OBBY_PARTY_MINIGAME',
  'STORY_RPG_ADVENTURE_RPG',
];
const fsAll={existsSync:()=>true};
const portfolio={status:'ACTIVE',paidApi:false,maxAutonomousWorkItemsPerDay:8,projects:[{id:'P0001',sourcePath:'web-games/a',mode:'IMPROVE'},{id:'P0002',sourcePath:'web-games/b',mode:'EXPERIMENT_ONLY'},{id:'P0007',sourcePath:'web-games/hold',mode:'HOLD'}]};
const attempts=ids=>({attempts:ids.map(gameId=>({date:'2026-09-11',gameId}))});
const scores=value=>({planning:value,graphics:value,development:value,qa:value,balance:value});
const directiveOverride={
  gameSeed:{initialTargetPlatform:'ROBLOX'},
  platformStrategy:{primaryPlatform:'ROBLOX'},
  platformPortfolioSets:{platformSets:{ROBLOX:{categories:ROBLOX_CATEGORIES,requiredCategories:['STORY_RPG_ADVENTURE_RPG']}}},
};
const platformProfilesOverride={platforms:{ROBLOX:{categories:Object.fromEntries(ROBLOX_CATEGORIES.map(category=>[category,{}]))}}};
const robloxSeeds=(categories=ROBLOX_CATEGORIES)=>categories.map((category,index)=>({
  seedId:`R${index+1}`,
  gameId:`roblox-${index+1}`,
  GAME_CATEGORY:category,
  INITIAL_TARGET_PLATFORM:'ROBLOX',
  status:'ACTIVE',
}));
const seeded=(patch={},categories=ROBLOX_CATEGORIES)=>normalizeSeedState({
  version:1,
  bootstrapCompletedAt:'2026-09-11T00:00:00Z',
  categories:['A'],
  seeds:robloxSeeds(categories),
  portfolioSeedRequests:[],
  ...patch,
});
const decide=args=>decidePortfolioContinuation({...args,directiveOverride,platformProfilesOverride});

test('missing initial bootstrap dispatches the historical GAME_SEED bootstrap',()=>{
  const d=decide({portfolio,queueState:attempts(['P0001','P0002']),seedState:normalizeSeedState({version:1,seeds:[],portfolioSeedRequests:[]}),date:'2026-09-11',filesystem:fsAll});
  assert.equal(d.action,'DISPATCH_GAME_SEED');
  assert.equal(d.reason,'INITIAL_SIX_SEED_BOOTSTRAP_REQUIRED');
  assert.equal(d.seedMode,'INITIAL_BOOTSTRAP');
});

test('missing Roblox representative category dispatches before old game queue work',()=>{
  const categories=ROBLOX_CATEGORIES.filter(category=>category!=='OBBY_PARTY_MINIGAME');
  const d=decide({portfolio,queueState:attempts([]),seedState:seeded({},categories),date:'2026-09-11',filesystem:fsAll});
  assert.equal(d.action,'DISPATCH_GAME_SEED');
  assert.equal(d.reason,'PLATFORM_REPRESENTATIVE_SET_FILL_REQUIRED');
  assert.equal(d.seedMode,'PLATFORM_SET_FILL');
  assert.equal(d.platform,'ROBLOX');
  assert.deepEqual(d.missingCategories,['OBBY_PARTY_MINIGAME']);
});

test('historical Unity categories do not consume Roblox representative slots',()=>{
  const historical=['ACTION_SURVIVAL_ROGUELITE','SINGLE_DEFENSE_STRATEGY','PUZZLE','CASUAL','IDLE_GROWTH_RPG','STORY_COMPLETE_RPG'];
  const state=seeded({seeds:historical.map((category,index)=>({seedId:`U${index}`,gameId:`unity-${index}`,GAME_CATEGORY:category,INITIAL_TARGET_PLATFORM:'UNITY',status:'ACTIVE'}))},[]);
  const d=decide({portfolio,queueState:attempts(['P0001','P0002']),seedState:state,date:'2026-09-11',filesystem:fsAll});
  assert.equal(d.seedMode,'PLATFORM_SET_FILL');
  assert.deepEqual(d.missingCategories,ROBLOX_CATEGORIES);
});

test('mandatory Story RPG remains a fill gap when the other five Roblox categories exist',()=>{
  const categories=ROBLOX_CATEGORIES.filter(category=>category!=='STORY_RPG_ADVENTURE_RPG');
  const d=decide({portfolio,queueState:attempts(['P0001','P0002']),seedState:seeded({},categories),date:'2026-09-11',filesystem:fsAll});
  assert.equal(d.seedMode,'PLATFORM_SET_FILL');
  assert.deepEqual(d.missingCategories,['STORY_RPG_ADVENTURE_RPG']);
});

test('completed Roblox representative set lets remaining game work continue',()=>{
  const d=decide({portfolio,queueState:attempts(['P0001']),seedState:seeded(),date:'2026-09-11',filesystem:fsAll});
  assert.equal(d.action,'WAIT_GAME_QUEUE');
  assert.deepEqual(d.remaining,['P0002']);
});

test('discarded non-representative seed alone does not dispatch score expansion',()=>{
  const state=seeded({seeds:[...robloxSeeds(),{seedId:'SX',gameId:'extra',GAME_CATEGORY:'PUZZLE',INITIAL_TARGET_PLATFORM:'UNITY',status:'ACTIVE'}]});
  markSeedDiscarded(state,'extra',{timestamp:'2026-09-12T00:00:00Z'});
  const d=decide({portfolio,queueState:attempts(['P0001','P0002']),seedState:state,date:'2026-09-11',filesystem:fsAll});
  assert.equal(d.action,'STOP');
  assert.equal(d.reason,'NO_SCORE_APPROVED_PORTFOLIO_EXPANSION');
  assert.equal('vacancies' in state,false);
});

test('discarded mandatory Roblox representative reopens that platform category gap',()=>{
  const state=seeded();
  const story=state.seeds.find(seed=>seed.GAME_CATEGORY==='STORY_RPG_ADVENTURE_RPG');
  markSeedDiscarded(state,story.gameId,{timestamp:'2026-09-12T00:00:00Z'});
  const d=decide({portfolio,queueState:attempts(['P0001','P0002']),seedState:state,date:'2026-09-11',filesystem:fsAll});
  assert.equal(d.seedMode,'PLATFORM_SET_FILL');
  assert.deepEqual(d.missingCategories,['STORY_RPG_ADVENTURE_RPG']);
});

test('score-approved five-department expansion dispatches after representative set is complete',()=>{
  const state=seeded();
  const request=createPortfolioSeedRequest(state,{category:'SIMULATOR_TYCOON_INCREMENTAL',targetPlatform:'ROBLOX',departmentScores:scores(90),evidenceRefs:['department-review:2026-09-12']});
  const d=decide({portfolio,queueState:attempts(['P0001','P0002']),seedState:state,date:'2026-09-11',filesystem:fsAll});
  assert.equal(d.action,'DISPATCH_GAME_SEED');
  assert.equal(d.reason,'DEPARTMENT_SCORE_GUIDED_PORTFOLIO_EXPANSION_REQUIRED');
  assert.equal(d.seedMode,'DYNAMIC_PORTFOLIO_EXPANSION');
  assert.deepEqual(d.portfolioSeedRequests,[{id:request.id,category:'SIMULATOR_TYCOON_INCREMENTAL',targetPlatform:'ROBLOX',aggregateScore:90,decisionBand:'EXPAND',ownerOverride:false}]);
});

test('no approved expansion request does not grow beyond completed representative set',()=>{
  const d=decide({portfolio,queueState:attempts(['P0001','P0002']),seedState:seeded(),date:'2026-09-11',filesystem:fsAll});
  assert.equal(d.action,'STOP');
  assert.equal(d.reason,'NO_SCORE_APPROVED_PORTFOLIO_EXPANSION');
});

test('required platform set fill is not cancelled by daily work cap',()=>{
  const p={...portfolio,maxAutonomousWorkItemsPerDay:2};
  const categories=ROBLOX_CATEGORIES.slice(0,5);
  const d=decide({portfolio:p,queueState:attempts(['P0001','P0002']),seedState:seeded({},categories),date:'2026-09-11',filesystem:fsAll});
  assert.equal(d.action,'DISPATCH_GAME_SEED');
  assert.equal(d.seedMode,'PLATFORM_SET_FILL');
});

test('daily work cap does not cancel an already approved portfolio expansion decision',()=>{
  const p={...portfolio,maxAutonomousWorkItemsPerDay:2};
  const state=seeded();
  createPortfolioSeedRequest(state,{category:'CASUAL',departmentScores:scores(88),evidenceRefs:['department-review:2026-09-12']});
  const d=decide({portfolio:p,queueState:attempts(['P0001','P0002']),seedState:state,date:'2026-09-11',filesystem:fsAll});
  assert.equal(d.action,'DISPATCH_GAME_SEED');
  assert.equal(d.seedMode,'DYNAMIC_PORTFOLIO_EXPANSION');
});

test('daily work cap stops only when set is complete and no approved expansion exists',()=>{
  const p={...portfolio,maxAutonomousWorkItemsPerDay:2};
  const d=decide({portfolio:p,queueState:attempts(['P0001','P0002']),seedState:seeded(),date:'2026-09-11',filesystem:fsAll});
  assert.equal(d.action,'STOP');
  assert.equal(d.reason,'DAILY_AUTONOMOUS_CAP_REACHED');
});
