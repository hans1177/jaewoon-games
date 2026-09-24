import test from 'node:test';
import assert from 'node:assert/strict';
import {mergeRuntimeQueueDelta} from '../tools/company-runtime-optimistic-merge.mjs';

const item=(id,extra={})=>({gameId:id,status:'ACTIVE',value:1,other:'keep',...extra});

test('optimistic runtime merge allows different games to persist concurrently',()=>{
  const base={updatedAt:'2026-09-24T00:00:00.000Z',items:[item('a'),item('b')]};
  const updated={updatedAt:'2026-09-24T00:01:00.000Z',items:[item('a',{value:2}),item('b')]};
  const current={updatedAt:'2026-09-24T00:00:30.000Z',items:[item('a'),item('b',{value:9})]};
  const r=mergeRuntimeQueueDelta({base,updated,current});
  assert.equal(r.pass,true);
  assert.equal(r.queue.items.find(x=>x.gameId==='a').value,2);
  assert.equal(r.queue.items.find(x=>x.gameId==='b').value,9);
});

test('optimistic runtime merge combines non-overlapping fields on the same game',()=>{
  const base={items:[item('a')]};
  const updated={items:[item('a',{value:2})]};
  const current={items:[item('a',{other:'new'})]};
  const r=mergeRuntimeQueueDelta({base,updated,current});
  assert.equal(r.pass,true);
  assert.equal(r.queue.items[0].value,2);
  assert.equal(r.queue.items[0].other,'new');
});

test('optimistic runtime merge rejects two different writes to the same field',()=>{
  const base={items:[item('a')]};
  const updated={items:[item('a',{value:2})]};
  const current={items:[item('a',{value:3})]};
  const r=mergeRuntimeQueueDelta({base,updated,current});
  assert.equal(r.pass,false);
  assert.deepEqual(r.conflicts,[{gameId:'a',field:'value',reason:'CONCURRENT_FIELD_CHANGE'}]);
});
