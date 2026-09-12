import test from 'node:test';
import assert from 'node:assert/strict';
import {decidePortfolioContinuation} from '../tools/autonomous-portfolio-continuation.mjs';
import {createPortfolioSeedRequest,normalizeSeedState} from '../tools/game-seed-state.mjs';

const fsAll={existsSync:()=>true};
const portfolio={status:'ACTIVE',paidApi:false,maxAutonomousWorkItemsPerDay:8,projects:[{id:'P0001',sourcePath:'web-games/a',mode:'IMPROVE'},{id:'P0002',sourcePath:'web-games/b',mode:'EXPERIMENT_ONLY'},{id:'P0007',sourcePath:'web-games/hold',mode:'HOLD'}]};
const attempts=ids=>({attempts:ids.map(gameId=>({date:'2026-09-11',gameId}))});
const seeded=patch=>normalizeSeedState({version:1,bootstrapCompletedAt:'2026-09-11T00:00:00Z',categories:['A'],seeds:[],vacancies:[],portfolioSeedRequests:[],...patch});
const scores=value=>({planning:value,graphics:value,development:value,qa:value,balance:value});

test('remaining game work keeps portfolio in game queue',()=>{
  const d=decidePortfolioContinuation({portfolio,queueState:attempts(['P0001']),seedState:seeded(),date:'2026-09-11',filesystem:fsAll});
  assert.equal(d.action,'WAIT_GAME_QUEUE');
  assert.deepEqual(d.remaining,['P0002']);
});

test('missing initial bootstrap dispatches the historical GAME_SEED bootstrap',()=>{
  const d=decidePortfolioContinuation({portfolio,queueState:attempts(['P0001','P0002']),seedState:normalizeSeedState({version:1,seeds:[],vacancies:[],portfolioSeedRequests:[]}),date:'2026-09-11',filesystem:fsAll});
  assert.equal(d.action,'DISPATCH_GAME_SEED');
  assert.equal(d.reason,'INITIAL_SIX_SEED_BOOTSTRAP_REQUIRED');
  assert.equal(d.seedMode,'INITIAL_BOOTSTRAP');
});

test('a discard vacancy alone does not dispatch GAME_SEED replenishment',()=>{
  const state=seeded({vacancies:[{id:'VAC-00001',category:'PUZZLE',reason:'DISCARDED',filledAt:null,replacementSeedId:null}]});
  const d=decidePortfolioContinuation({portfolio,queueState:attempts(['P0001','P0002']),seedState:state,date:'2026-09-11',filesystem:fsAll});
  assert.equal(d.action,'STOP');
  assert.equal(d.reason,'NO_SCORE_APPROVED_PORTFOLIO_EXPANSION');
});

test('score-approved five-department expansion dispatches GAME_SEED',()=>{
  const state=seeded();
  const request=createPortfolioSeedRequest(state,{category:'PUZZLE',departmentScores:scores(90),evidenceRefs:['department-review:2026-09-12']});
  const d=decidePortfolioContinuation({portfolio,queueState:attempts(['P0001','P0002']),seedState:state,date:'2026-09-11',filesystem:fsAll});
  assert.equal(d.action,'DISPATCH_GAME_SEED');
  assert.equal(d.reason,'DEPARTMENT_SCORE_GUIDED_PORTFOLIO_EXPANSION_REQUIRED');
  assert.equal(d.seedMode,'DYNAMIC_PORTFOLIO_EXPANSION');
  assert.deepEqual(d.portfolioSeedRequests,[{id:request.id,category:'PUZZLE',aggregateScore:90,decisionBand:'EXPAND',ownerOverride:false}]);
});

test('no approved expansion request does not grow seed count',()=>{
  const d=decidePortfolioContinuation({portfolio,queueState:attempts(['P0001','P0002']),seedState:seeded(),date:'2026-09-11',filesystem:fsAll});
  assert.equal(d.action,'STOP');
  assert.equal(d.reason,'NO_SCORE_APPROVED_PORTFOLIO_EXPANSION');
});

test('daily work cap does not cancel an already approved portfolio expansion decision',()=>{
  const p={...portfolio,maxAutonomousWorkItemsPerDay:2};
  const state=seeded();
  createPortfolioSeedRequest(state,{category:'CASUAL',departmentScores:scores(88),evidenceRefs:['department-review:2026-09-12']});
  const d=decidePortfolioContinuation({portfolio:p,queueState:attempts(['P0001','P0002']),seedState:state,date:'2026-09-11',filesystem:fsAll});
  assert.equal(d.action,'DISPATCH_GAME_SEED');
  assert.equal(d.seedMode,'DYNAMIC_PORTFOLIO_EXPANSION');
});

test('daily work cap stops only when there is no approved portfolio expansion',()=>{
  const p={...portfolio,maxAutonomousWorkItemsPerDay:2};
  const d=decidePortfolioContinuation({portfolio:p,queueState:attempts(['P0001','P0002']),seedState:seeded(),date:'2026-09-11',filesystem:fsAll});
  assert.equal(d.action,'STOP');
  assert.equal(d.reason,'DAILY_AUTONOMOUS_CAP_REACHED');
});
