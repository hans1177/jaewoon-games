import test from 'node:test';
import assert from 'node:assert/strict';
import { attemptedGameIds, attemptsForDate, reserveQueueWork } from '../tools/autonomous-queue-state.mjs';

test('reserves one game once per KST work date',()=>{
  const next=reserveQueueWork({version:1,attempts:[]},{date:'2026-09-09',gameId:'P0001',gameSlug:'a',sourcePath:'web-games/a',runId:'7',now:new Date('2026-09-09T00:00:00Z')});
  assert.equal(attemptsForDate(next,'2026-09-09').length,1);
  assert.equal(attemptedGameIds(next,'2026-09-09').has('P0001'),true);
  assert.throws(()=>reserveQueueWork(next,{date:'2026-09-09',gameId:'P0001'}),/already attempted today/);
});

test('same game may be reconsidered on a later date',()=>{
  const first=reserveQueueWork({version:1,attempts:[]},{date:'2026-09-09',gameId:'P0001',now:new Date('2026-09-09T00:00:00Z')});
  const second=reserveQueueWork(first,{date:'2026-09-10',gameId:'P0001',now:new Date('2026-09-10T00:00:00Z')});
  assert.equal(attemptsForDate(second,'2026-09-10').length,1);
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
