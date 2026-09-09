import test from 'node:test';
import assert from 'node:assert/strict';
import { attemptedGameIds, attemptCountForGameOnDate, attemptsForDate, reserveQueueWork } from '../tools/autonomous-queue-state.mjs';

test('same game can reserve multiple 24h development floors on one KST work date',()=>{
  const first=reserveQueueWork({version:1,attempts:[]},{date:'2026-09-09',gameId:'P0001',gameSlug:'a',sourcePath:'web-games/a',runId:'7',now:new Date('2026-09-09T00:00:00Z')});
  const second=reserveQueueWork(first,{date:'2026-09-09',gameId:'P0001',gameSlug:'a',sourcePath:'web-games/a',runId:'8',now:new Date('2026-09-09T00:10:00Z')});
  assert.equal(attemptsForDate(second,'2026-09-09').length,2);
  assert.equal(attemptedGameIds(second,'2026-09-09').has('P0001'),true);
  assert.equal(attemptCountForGameOnDate(second,'2026-09-09','P0001'),2);
  assert.deepEqual(attemptsForDate(second,'2026-09-09').map(x=>x.floor),[1,2]);
});

test('same game may continue again on a later date',()=>{
  const first=reserveQueueWork({version:1,attempts:[]},{date:'2026-09-09',gameId:'P0001',now:new Date('2026-09-09T00:00:00Z')});
  const second=reserveQueueWork(first,{date:'2026-09-10',gameId:'P0001',now:new Date('2026-09-10T00:00:00Z')});
  assert.equal(attemptsForDate(second,'2026-09-10').length,1);
  assert.equal(attemptCountForGameOnDate(second,'2026-09-10','P0001'),1);
});

test('old queue attempts are pruned while recent evidence is retained',()=>{
  const state={version:1,attempts:[
    {date:'2026-07-01',gameId:'P0009'},
    {date:'2026-09-08',gameId:'P0002'},
  ]};
  const next=reserveQueueWork(state,{date:'2026-09-09',gameId:'P0001',now:new Date('2026-09-09T00:00:00Z')});
  assert.equal(next.attempts.some(x=>x.gameId==='P0009'),false);
  assert.equal(next.attempts.some(x=>x.gameId==='P0002'),true);
});
