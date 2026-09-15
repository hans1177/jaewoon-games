import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expectedStudyTasks, guardProductionStudyResults } from '../tools/vibe2-game-study-production-fanin.mjs';
import { applyGameStudyFanIn } from '../tools/vibe2-game-study-queue.mjs';

function temp() { return fs.mkdtempSync(path.join(os.tmpdir(), 'vibe2-study-fanin-')); }
function writeJson(file, value) { fs.writeFileSync(file, JSON.stringify(value, null, 2), 'utf8'); }
function pass(taskId, targetId = taskId, engine = 'web') {
  return { taskId, targetId, engine, outcome: 'PASS', study: { id: `study-${taskId}`, verified: true, authorityExpanded: false }, authorityExpanded: false };
}

test('expected matrix tasks are deduplicated across Web and Roblox matrices', () => {
  const rows = expectedStudyTasks({
    webMatrixJson: JSON.stringify({ include: [{ taskId: 'study-a', targetId: 'a', engine: 'web' }] }),
    robloxMatrixJson: JSON.stringify({ include: [{ taskId: 'study-a', targetId: 'a2', engine: 'roblox' }, { taskId: 'study-b', targetId: 'b', engine: 'roblox' }] })
  });
  assert.deepEqual(rows.map((row) => row.taskId), ['study-a', 'study-b']);
  assert.equal(rows[0].targetId, 'a');
  assert.equal(rows[0].engine, 'web');
});

test('missing reserved study result becomes explicit FAIL evidence and returns through retry policy', () => {
  const root = temp();
  writeJson(path.join(root, 'study-a.json'), pass('study-a', 'a'));
  const expected = [
    { taskId: 'study-a', targetId: 'a', engine: 'web' },
    { taskId: 'study-b', targetId: 'b', engine: 'web' }
  ];
  const guard = guardProductionStudyResults({ resultsDir: root, expectedTasks: expected });
  assert.equal(guard.expectedCount, 2);
  assert.equal(guard.missingCount, 1);
  assert.deepEqual(guard.missingTaskIds, ['study-b']);
  const synthetic = JSON.parse(fs.readFileSync(path.join(root, '__missing-study-b.json'), 'utf8'));
  assert.equal(synthetic.outcome, 'FAIL');
  assert.equal(synthetic.blocker, 'game-study-result-missing');
  assert.equal(synthetic.authorityExpanded, false);

  const queue = {
    maxConcurrentTasks: 20,
    tasks: expected.map((row) => ({
      id: row.taskId, gameId: row.taskId, target: row.engine, department: 'qa', type: 'research', goal: 'study',
      status: 'running', retries: 0, maxRetries: 2, sourceRoot: `game-study:${row.taskId}`,
      evidence: [`game-study-target:${row.targetId}`]
    }))
  };
  const results = fs.readdirSync(root).filter((name) => name.endsWith('.json')).map((name) => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8')));
  const fanIn = applyGameStudyFanIn({ queueInput: queue, experienceInput: { records: [] }, results });
  const missingTask = fanIn.queue.tasks.find((row) => row.id === 'study-b');
  assert.equal(missingTask.status, 'queued');
  assert.equal(missingTask.retries, 1);
  assert.equal(missingTask.lastOutcome, 'FAIL');
});

test('duplicate artifacts are all rejected so ambiguity cannot double-promote knowledge', () => {
  const root = temp();
  writeJson(path.join(root, 'a.json'), pass('study-a', 'a'));
  writeJson(path.join(root, 'z.json'), pass('study-a', 'a'));
  const result = guardProductionStudyResults({
    resultsDir: root,
    expectedTasks: [{ taskId: 'study-a', targetId: 'a', engine: 'web' }]
  });
  assert.equal(result.duplicateCount, 2);
  assert.equal(result.ambiguousCount, 1);
  assert.equal(result.missingCount, 1);
  const active = fs.readdirSync(root).filter((name) => name.endsWith('.json'));
  assert.deepEqual(active, ['__missing-study-a.json']);
  const synthetic = JSON.parse(fs.readFileSync(path.join(root, active[0]), 'utf8'));
  assert.equal(synthetic.blocker, 'game-study-result-ambiguous');
  assert.equal(result.authorityExpanded, false);
});

test('stale, mismatched, malformed and unverified PASS artifacts are disabled before fan-in', () => {
  const root = temp();
  fs.writeFileSync(path.join(root, 'broken.json'), '{bad', 'utf8');
  writeJson(path.join(root, 'stale.json'), pass('study-old', 'old'));
  writeJson(path.join(root, 'wrong-target.json'), pass('study-a', 'wrong'));
  writeJson(path.join(root, 'unverified.json'), { taskId: 'study-b', targetId: 'b', engine: 'web', outcome: 'PASS', study: { verified: false }, authorityExpanded: false });
  writeJson(path.join(root, 'good.json'), { taskId: 'study-c', targetId: 'c', engine: 'roblox', outcome: 'BLOCKED', blocker: 'runner-unavailable', study: null, authorityExpanded: false });
  const result = guardProductionStudyResults({
    resultsDir: root,
    expectedTasks: [
      { taskId: 'study-a', targetId: 'a', engine: 'web' },
      { taskId: 'study-b', targetId: 'b', engine: 'web' },
      { taskId: 'study-c', targetId: 'c', engine: 'roblox' }
    ]
  });
  assert.equal(result.invalidCount, 2);
  assert.equal(result.mismatchCount, 1);
  assert.equal(result.unexpectedCount, 1);
  assert.equal(result.missingCount, 2);
  assert.equal(result.usableResultCount, 3);
  assert.equal(fs.readdirSync(root).filter((name) => name.endsWith('.json')).length, 3);
});
