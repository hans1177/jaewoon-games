import test from 'node:test';
import assert from 'node:assert/strict';
import {decidePortfolioContinuation} from '../tools/autonomous-portfolio-continuation.mjs';

const fsAll={existsSync:()=>true};
const portfolio={status:'ACTIVE',paidApi:false,maxAutonomousWorkItemsPerDay:8,projects:[{id:'P0001',sourcePath:'web-games/a',mode:'IMPROVE'},{id:'P0002',sourcePath:'web-games/b',mode:'EXPERIMENT_ONLY'},{id:'P0007',sourcePath:'web-games/hold',mode:'HOLD'}]};
const attempts=ids=>({attempts:ids.map(gameId=>({date:'2026-09-11',gameId}))});
const seeded=patch=>({version:1,bootstrapCompletedAt:'2026-09-11T00:00:00Z',categories:['A'],seeds:[],vacancies:[],...patch});

test('remaining game work keeps portfolio in game queue',()=>{
  const d=decidePortfolioContinuation({portfolio,queueState:attempts(['P0001']),seedState:seeded(),date:'2026-09-11',filesystem:fsAll});
  assert.equal(d.action,'WAIT_GAME_QUEUE');
  assert.deepEqual(d.remaining,['P0002']);
});

test('missing initial bootstrap dispatches GAME_SEED instead of free concept incubator',()=>{
  const d=decidePortfolioContinuation({portfolio,queueState:attempts(['P0001','P0002']),seedState:{version:1,seeds:[],vacancies:[]},date:'2026-09-11',filesystem:fsAll});
  assert.equal(d.action,'DISPATCH_GAME_SEED');
  assert.equal(d.reason,'INITIAL_SIX_SEED_BOOTSTRAP_REQUIRED');
  assert.equal(d.seedMode,'INITIAL_BOOTSTRAP');
});

test('discard vacancy dispatches one-for-one GAME_SEED replenishment',()=>{
  const d=decidePortfolioContinuation({portfolio,queueState:attempts(['P0001','P0002']),seedState:seeded({vacancies:[{id:'VAC-00001',category:'PUZZLE',reason:'DISCARDED',filledAt:null,replacementSeedId:null}]}),date:'2026-09-11',filesystem:fsAll});
  assert.equal(d.action,'DISPATCH_GAME_SEED');
  assert.equal(d.seedMode,'ONE_FOR_ONE_REPLENISHMENT');
  assert.deepEqual(d.vacancies,[{id:'VAC-00001',category:'PUZZLE',reason:'DISCARDED'}]);
});

test('promotion or no vacancy never grows seed count',()=>{
  const d=decidePortfolioContinuation({portfolio,queueState:attempts(['P0001','P0002']),seedState:seeded(),date:'2026-09-11',filesystem:fsAll});
  assert.equal(d.action,'STOP');
  assert.equal(d.reason,'NO_GAME_SEED_VACANCY');
});

test('daily development cap does not block mandatory seed vacancy check',()=>{
  const p={...portfolio,maxAutonomousWorkItemsPerDay:2};
  const d=decidePortfolioContinuation({portfolio:p,queueState:attempts(['P0001','P0002']),seedState:seeded({vacancies:[{id:'VAC-00002',category:'CASUAL',reason:'OWNER_REMOVED',filledAt:null,replacementSeedId:null}]}),date:'2026-09-11',filesystem:fsAll});
  assert.equal(d.action,'DISPATCH_GAME_SEED');
});
