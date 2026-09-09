import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow=fs.readFileSync('.github/workflows/public-game-health.yml','utf8');

test('public game health persistence does not require optional learning evidence directory',()=>{
  const persist=workflow.split('- name: Persist health, learning evidence and revision request when changed')[1]||'';
  assert.match(persist,/git add public-game-health\.json public-release-baselines\.json asset-health\.json company-qa-runtime-evidence\.json company-learning\/bug-memory\.json artbook-revision-queue\.json/);
  assert.match(persist,/if \[ -d company-learning\/evidence \]; then\s+git add company-learning\/evidence\s+fi/);
  assert.doesNotMatch(persist,/artbook-revision-queue\.json company-learning\/evidence/);
});
