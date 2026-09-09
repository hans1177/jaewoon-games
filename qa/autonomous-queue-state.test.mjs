import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  activeGameIds,
  activeReservations,
  attemptedGameIds,
  attemptCountForGameOnDate,
  attemptsForDate,
  reserveQueueWork,
  settleQueueWork,
} from '../tools/autonomous-queue-state.mjs';

test('same game can reserve multiple 24h development floors on one KST work date after prior lease settles',()=>{
  const first=reserveQueueWork({version:1,attempts:[]},{date:'2026-09-09',gameId:'P0001',gameSlug:'a',sourcePath:'web-games/a',runId:'7',now:new Date('2026-09-09T00:00:00Z')});
  const settled=settleQueueWork(first,{runId:'7',status:'RELEASED',now:new Date('2026-09-09T00:05:00Z')});
  const second=reserveQueueWork(settled,{date:'2026-09-09',gameId:'P0001',gameSlug:'a',sourcePath:'web-games/a',runId:'8',now:new Date('2026-09-09T00:10:00Z')});
  assert.equal(attemptsForDate(second,'2026-09-09').length,2);
  assert.equal(attemptedGameIds(second,'2026-09-09').has('P0001'),true);
  assert.equal(attemptCountForGameOnDate(second,'2026-09-09','P0001'),2);
  assert.deepEqual(attemptsForDate(second,'2026-09-09').map(x=>x.floor),[1,2]);
  assert.deepEqual([...activeGameIds(second,{now:new Date('2026-09-09T00:11:00Z')})],['P0001']);
});

test('new reservations are active leases and historical rows without leases do not lock source roots',()=>{
  const state={version:1,attempts:[{date:'2026-09-09',gameId:'OLD',sourcePath:'web-games/old',status:'RESERVED',reservedAt:'2026-09-09T00:00:00Z'}]};
  const next=reserveQueueWork(state,{date:'2026-09-09',gameId:'P0001',sourcePath:'web-games/a',runId:'9',now:new Date('2026-09-09T01:00:00Z')});
  const active=activeReservations(next,{now:new Date('2026-09-09T01:01:00Z')});
  assert.deepEqual(active.map(x=>x.gameId),['P0001']);
  assert.ok(active[0].leaseExpiresAt);
});

test('released source or settled failure immediately removes an active reservation',()=>{
  const reserved=reserveQueueWork({version:2,attempts:[]},{date:'2026-09-09',gameId:'P0001',sourcePath:'web-games/a',runId:'10',now:new Date('2026-09-09T02:00:00Z')});
  assert.equal(activeReservations(reserved,{now:new Date('2026-09-09T02:01:00Z'),isSourceReleased:()=>true}).length,0);
  const failed=settleQueueWork(reserved,{runId:'10',status:'FAILED',now:new Date('2026-09-09T02:02:00Z')});
  assert.equal(activeReservations(failed,{now:new Date('2026-09-09T02:03:00Z')}).length,0);
  assert.equal(failed.attempts[0].status,'FAILED');
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

test('failed-floor recovery cannot be evicted by the prepare writer queue and retries branch races',()=>{
  const workflow=fs.readFileSync(new URL('../.github/workflows/autonomous-continuous-development.yml',import.meta.url),'utf8');
  const recover=workflow.split('\n  recover:\n')[1]||'';
  assert.match(recover,/group: autonomous-dev-recovery-\$\{\{ github\.run_id \}\}/);
  assert.doesNotMatch(recover,/group: autonomous-dev-writer/);
  assert.match(recover,/for attempt in 1 2 3 4 5; do/);
  assert.match(recover,/git reset --hard origin\/autonomous-dev/);
  assert.match(recover,/if git push origin HEAD:autonomous-dev; then/);
});
