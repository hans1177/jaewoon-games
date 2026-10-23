import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('GitHub PWA owner work uses original cloud queue without local PC or Ollama',()=>{
  const source=fs.readFileSync('.github/workflows/pwa-command-bridge.yml','utf8');
  const localStart=source.indexOf('  bridge:'),cloudStart=source.indexOf('  github-cloud:');
  assert.ok(localStart>0&&cloudStart>localStart);
  const local=source.slice(localStart,cloudStart),cloud=source.slice(cloudStart);
  assert.ok(cloud.includes("if: github.event_name != 'issue_comment'"));
  assert.ok(cloud.includes("if [ \"$GITHUB_EVENT_NAME\" = 'repository_dispatch' ]"));
  assert.ok(cloud.includes('OWNER_WEB_CLOUD_INGEST=AUTHORIZED'));
  assert.ok(cloud.includes('validateLocalWebOwnerEvent'));
  assert.ok(cloud.includes('runs-on: ubuntu-latest'));
  assert.ok(cloud.includes('VIBE2_BRANCH: vibe2-unreal-core'));
  assert.ok(cloud.includes('origin/$VIBE2_BRANCH:.vibe2/queue.json'));
  assert.ok(cloud.includes('pwa-command-vibe2-task.mjs" ingest'));
  assert.ok(cloud.includes('gh workflow run vibe2-continuous-core.yml'));
  assert.ok(cloud.includes('COMPANY_OIDC_TOKEN'));
  assert.ok(!cloud.includes('WEB_VIBE_GH_TOKEN'));
  assert.ok(!cloud.includes('11435'));
  assert.ok(!cloud.includes('web-vibe-organization.mjs'));
  assert.ok(!local.includes("github.event_name == 'repository_dispatch'"));
  assert.ok(local.includes("github.event_name == 'issue_comment'"));
  assert.ok(local.includes('WEB_VIBE_EXECUTION=DEDICATED_LOCAL_ENGINE_REQUIRED'));
  assert.ok(local.includes('web-vibe-organization.mjs" ingest'));
  assert.ok(!local.includes('gh workflow run'));
  assert.ok(!local.includes('vibe2-unreal-core'));
});

test('local-only issue comment remains independent while authenticated dispatch runs in the cloud',()=>{
  const source=fs.readFileSync('.github/workflows/pwa-command-bridge.yml','utf8');
  const local=source.slice(source.indexOf('  bridge:'),source.indexOf('  github-cloud:'));
  const cloud=source.slice(source.indexOf('  github-cloud:'));
  assert.ok(cloud.includes("steps.next.outputs.has_work == 'true'"));
  assert.ok(!cloud.includes('steps.local.outputs'));
  assert.ok(local.includes("steps.local.outputs.has_work == 'true'"));
  assert.ok(!local.includes('steps.next.outputs'));
  const native=fs.readFileSync('.github/workflows/company-owner-web-edit-propagation.yml','utf8');
  assert.ok(!native.includes('gh workflow run company-development-roblox-runtime.yml'));
  assert.ok(!native.includes('gh workflow run company-development-unity-runtime.yml'));
});
