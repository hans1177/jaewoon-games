import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { planVibe2AutonomousTask } from '../tools/vibe2-auto-planner.mjs';

function tempRepo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe2-auto-plan-'));
  const scripts = path.join(root, 'unity-games/demo/Assets/Scripts');
  fs.mkdirSync(scripts, { recursive: true });
  fs.writeFileSync(path.join(scripts, 'GameCore.cs'), 'var regions = new Dictionary<string, object> { ["field-4"] = new object() };\npublic List<string> ownedWeapons;\n', 'utf8');
  fs.writeFileSync(path.join(scripts, 'RuntimeBootstrap.cs'), 'if (GUILayout.Button("FIELD 1")) MoveTo("field-1");\n', 'utf8');
  fs.writeFileSync(path.join(scripts, 'PrototypeAnimatedVisuals.cs'), 'public void PlayTravelToBattle() { StartCoroutine(TravelRoutine()); }\n', 'utf8');
  return root;
}

const status = {
  projects: [{
    gameId: 'demo',
    ownerDecision: 'PASS',
    target: 'unity-android',
    projectPath: 'unity-games/demo',
    stage: 'full-development'
  }]
};

test('active queued work prevents autonomous task invention', () => {
  const root = tempRepo();
  const result = planVibe2AutonomousTask({
    status,
    queue: { tasks: [{ id: 'existing', status: 'queued', goal: 'existing task', target: 'unity' }] },
    repoRoot: root
  });
  assert.equal(result.planned, false);
  assert.equal(result.reason, 'ACTIVE_QUEUE_WORK_EXISTS');
});

test('planner chooses evidence-backed missing region UI without core changes', () => {
  const root = tempRepo();
  const result = planVibe2AutonomousTask({ status, queue: { tasks: [] }, repoRoot: root });
  assert.equal(result.planned, true);
  assert.equal(result.task.id, 'demo-region-controls-4-7');
  assert.equal(result.task.target, 'unity');
  assert.deepEqual(result.task.responsibleFiles, ['unity-games/demo/Assets/Scripts/RuntimeBootstrap.cs']);
  assert.equal(result.task.requiresOwnerDecision, false);
  assert.equal(result.task.protectedChange, false);
  assert.equal(result.task.paidResourceRequired, false);
});

test('planner never selects projects without owner PASS', () => {
  const root = tempRepo();
  const result = planVibe2AutonomousTask({
    status: { projects: [{ gameId: 'demo', ownerDecision: 'WAIT', target: 'unity-android', projectPath: 'unity-games/demo' }] },
    queue: { tasks: [] },
    repoRoot: root
  });
  assert.equal(result.planned, false);
  assert.equal(result.reason, 'NO_OWNER_APPROVED_PRODUCTION_PROJECT');
});

test('completed task ids are not recreated; planner moves to next source-backed maintenance need', () => {
  const root = tempRepo();
  const result = planVibe2AutonomousTask({
    status,
    queue: {
      tasks: [{
        id: 'demo-region-controls-4-7',
        gameId: 'demo', target: 'unity', department: 'development', type: 'implementation',
        goal: 'done', responsibleFiles: [], dependencies: [], priority: 'high', status: 'done',
        retries: 0, maxRetries: 2, ownerDirective: false, requiresOwnerDecision: false,
        protectedChange: false, paidResourceRequired: false, evidence: []
      }]
    },
    repoRoot: root
  });
  assert.equal(result.planned, true);
  assert.equal(result.task.id, 'demo-save-null-guards');
});
