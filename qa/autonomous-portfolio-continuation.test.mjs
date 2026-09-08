import test from 'node:test';
import assert from 'node:assert/strict';
import { decidePortfolioContinuation } from '../tools/autonomous-portfolio-continuation.mjs';

const fsAll={existsSync:()=>true};
const portfolio={status:'ACTIVE',paidApi:false,maxAutonomousWorkItemsPerDay:8,projects:[{id:'P0001',sourcePath:'web-games/a',mode:'IMPROVE'},{id:'P0002',sourcePath:'web-games/b',mode:'EXPERIMENT_ONLY'},{id:'P0007',sourcePath:'web-games/hold',mode:'HOLD'}]};
const attempts=(ids)=>({attempts:ids.map(gameId=>({date:'2026-09-09',gameId}))});

test('remaining game work keeps portfolio in game queue',()=>{
  const d=decidePortfolioContinuation({portfolio,queueState:attempts(['P0001']),incubator:{candidates:[]},date:'2026-09-09',filesystem:fsAll});
  assert.equal(d.action,'WAIT_GAME_QUEUE');
  assert.deepEqual(d.remaining,['P0002']);
});

test('all current game work exhausted with capacity dispatches new game incubator',()=>{
  const d=decidePortfolioContinuation({portfolio,queueState:attempts(['P0001','P0002']),incubator:{candidates:[]},date:'2026-09-09',filesystem:fsAll});
  assert.equal(d.action,'DISPATCH_INCUBATOR');
  assert.equal(d.remainingCapacity,6);
});

test('active incubator blocks duplicate new concept',()=>{
  const d=decidePortfolioContinuation({portfolio,queueState:attempts(['P0001','P0002']),incubator:{candidates:[{id:'NG00001',status:'ARTBOOK_QUEUED',prototypeDevComplete:false}]},date:'2026-09-09',filesystem:fsAll});
  assert.equal(d.action,'WAIT_INCUBATOR');
});

test('valid concept already created today blocks a second concept',()=>{
  const d=decidePortfolioContinuation({portfolio,queueState:attempts(['P0001','P0002']),incubator:{candidates:[{id:'NG00001',status:'PROTOTYPE_DEV_VERIFIED',prototypeDevComplete:true,createdAt:'2026-09-08T16:00:00Z'}]},date:'2026-09-09',filesystem:fsAll});
  assert.equal(d.action,'STOP');
  assert.equal(d.reason,'DAILY_NEW_CONCEPT_ALREADY_CREATED');
});

test('quality-rejected concept does not block a replacement concept on the same KST day',()=>{
  const d=decidePortfolioContinuation({portfolio,queueState:attempts(['P0001','P0002']),incubator:{candidates:[{id:'NG00001',status:'REDESIGN_REQUIRED',qualityGate:{pass:false},createdAt:'2026-09-08T16:00:00Z'}]},date:'2026-09-09',filesystem:fsAll});
  assert.equal(d.action,'DISPATCH_INCUBATOR');
});

test('daily autonomous cap blocks any new handoff',()=>{
  const p={...portfolio,maxAutonomousWorkItemsPerDay:2};
  const d=decidePortfolioContinuation({portfolio:p,queueState:attempts(['P0001','P0002']),incubator:{candidates:[]},date:'2026-09-09',filesystem:fsAll});
  assert.equal(d.reason,'DAILY_AUTONOMOUS_CAP_REACHED');
});
