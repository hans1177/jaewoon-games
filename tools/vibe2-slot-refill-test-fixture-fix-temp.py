from pathlib import Path

path = Path('qa/vibe2-queue-control.test.mjs')
text = path.read_text(encoding='utf-8')
start = text.index("test('completed single worker releases capacity before fan-in without dropping source locks or adding QA pressure', () => {")
end = text.index("test('stale slot-release callback never overwrites a real awaiting-QA blocker'", start)
replacement = """test('completed single worker releases capacity before fan-in without dropping source locks or adding QA pressure', () => {
  const queue=createVibeContinuousQueue({
    maxConcurrentTasks:2,
    tasks:[
      {id:'first',gameId:'game-a',target:'web',goal:'first',status:'running',responsibleFiles:['first.js']},
      {id:'other-running',gameId:'game-b',target:'web',goal:'other',status:'running',responsibleFiles:['b.js']},
      {id:'same-root',gameId:'game-a',target:'web',goal:'same',status:'queued',responsibleFiles:['first.js']},
      {id:'refill',gameId:'game-c',target:'web',goal:'refill',status:'queued',responsibleFiles:['c.js']}
    ]
  });
  const released=releaseVibeTaskExecutionSlot(queue,{taskId:'first',evidence:['worker-finished']});
  assert.equal(released.released,true);
  const batch=selectVibeQueueBatch(released.queue,{maxConcurrentTasks:2});
  assert.equal(batch.capacityRunning.length,1);
  assert.equal(batch.releasedWorkerSlots.length,1);
  assert.equal(batch.backpressure.awaitingQaCount,0);
  assert.equal(batch.selected.some(t=>t.id==='same-root'),false);
  assert.equal(batch.selected.some(t=>t.id==='refill'),true);
  const second=releaseVibeTaskExecutionSlot(released.queue,{taskId:'first'});
  assert.equal(second.released,false);
  assert.equal(second.reason,'ALREADY_RELEASED');
});

"""
path.write_text(text[:start] + replacement + text[end:], encoding='utf-8')
