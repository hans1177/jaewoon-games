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
  fs.mkdirSync(path.join(root, 'web-games/release-web'), { recursive: true });
  fs.writeFileSync(path.join(root, 'web-games/release-web/index.js'), '// TODO: remove duplicate click handler\nfunction start() {}\n', 'utf8');
  return root;
}
const status = { projects: [{ gameId:'demo', ownerDecision:'PASS', target:'unity-android', projectPath:'unity-games/demo', progress:80 }] };
const catalog = { games: [
  { id:'demo', homepageCategory:'development-confirmed' },
  { id:'release-web', name:'Release Web', webPath:'/web-games/release-web/', hasWebArchive:true, homepageWebPlayable:true, homepageCategory:'release-confirmed' }
] };

test('active queued or running work prevents autonomous task invention', () => {
  const root = tempRepo();
  const result = planVibe2AutonomousTask({ status, catalog, queue:{ tasks:[{ id:'existing', status:'queued', goal:'existing task', target:'unity' }] }, repoRoot:root });
  assert.equal(result.planned, false);
  assert.equal(result.reason, 'ACTIVE_QUEUE_WORK_EXISTS');
});

test('release-confirmed existing web task outranks development-confirmed Unity task', () => {
  const root = tempRepo();
  const result = planVibe2AutonomousTask({ status, catalog, queue:{ tasks:[] }, repoRoot:root });
  assert.equal(result.planned, true);
  assert.equal(result.task.gameId, 'release-web');
  assert.equal(result.task.target, 'web');
  assert.equal(result.task.releaseState, 'release-confirmed');
});

test('same release tier prefers existing Unity over existing web', () => {
  const root = tempRepo();
  const sameTier = { games: [
    { id:'demo', homepageCategory:'development-confirmed' },
    { id:'release-web', webPath:'/web-games/release-web/', hasWebArchive:true, homepageWebPlayable:true, homepageCategory:'development-confirmed' }
  ] };
  const result = planVibe2AutonomousTask({ status, catalog:sameTier, queue:{ tasks:[] }, repoRoot:root });
  assert.equal(result.planned, true);
  assert.equal(result.task.id, 'demo-region-controls-4-7');
  assert.equal(result.task.target, 'unity');
  assert.equal(result.task.releaseState, 'development-confirmed');
});

test('planner never selects Unity project without owner PASS', () => {
  const root = tempRepo();
  const result = planVibe2AutonomousTask({
    status:{ projects:[{ gameId:'demo', ownerDecision:'WAIT', target:'unity-android', projectPath:'unity-games/demo' }] },
    catalog:{ games:[{ id:'demo', homepageCategory:'development-confirmed' }] }, queue:{ tasks:[] }, repoRoot:root
  });
  assert.equal(result.planned, false);
  assert.equal(result.reason, 'NO_CONFIRMED_PRODUCTION_PROJECT');
});

test('completed task is not recreated and planner moves to next Unity maintenance need', () => {
  const root = tempRepo();
  const unityOnlyCatalog = { games:[{ id:'demo', homepageCategory:'development-confirmed' }] };
  const result = planVibe2AutonomousTask({
    status, catalog:unityOnlyCatalog,
    queue:{ tasks:[{ id:'demo-region-controls-4-7', gameId:'demo', target:'unity', goal:'done', priority:'high', releaseState:'development-confirmed', status:'done', retries:0, maxRetries:2 }] },
    repoRoot:root
  });
  assert.equal(result.planned, true);
  assert.equal(result.task.id, 'demo-save-null-guards');
});
