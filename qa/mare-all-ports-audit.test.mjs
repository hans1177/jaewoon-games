import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = 'roblox-games/mare-essentia/';
const steps = JSON.parse(readFileSync(root + 'tools/devloop/studio-scripts/mare-all-ports-audit.json', 'utf8'));
const ports = readFileSync(root + 'src/ReplicatedStorage/Shared/Ports.luau', 'utf8');
const section = ports.slice(ports.indexOf('local Ports:'), ports.indexOf('local Nations:'));
const ids = [...section.matchAll(/^\t([a-z][a-z0-9_]*)\s*=\s*\{\s*\n\s*id = /gm)].map((m) => m[1]);

test('Studio 전 항구 점검은 모든 항구를 짓고 숫자를 잰다', () => {
  assert.equal(ids.length, 181);
  const measured = new Set();
  for (const s of steps) {
    const m = s.type === 'luau' && /'ALLPORTS (\w+) 집=/.exec(s.code || '');
    if (m) measured.add(m[1]);
  }
  for (const id of ids) assert.ok(measured.has(id), `빠진 항구: ${id}`);
  assert.ok(steps.length <= 1000);
});
