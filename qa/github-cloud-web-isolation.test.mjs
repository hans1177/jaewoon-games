import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('original PWA polling retains its existing cloud queue while local chat uses WEB-only queue',()=>{
  const source=fs.readFileSync('.github/workflows/pwa-command-bridge.yml','utf8');
  const localStart=source.indexOf('  bridge:'),cloudStart=source.indexOf('  github-cloud:');
  assert.ok(localStart>0&&cloudStart>localStart);
  const local=source.slice(localStart,cloudStart),cloud=source.slice(cloudStart,source.indexOf('  web-cloud-onepatch:'));
  assert.ok(cloud.includes("if: github.event_name != 'issue_comment'"));
  assert.ok(!cloud.includes("if [ \"$GITHUB_EVENT_NAME\" = 'repository_dispatch' ]"));
  assert.ok(!cloud.includes('OWNER_WEB_CLOUD_INGEST=AUTHORIZED'));
  assert.ok(!cloud.includes('validateLocalWebOwnerEvent'));
  assert.ok(local.includes('validateLocalWebOwnerEvent'));
  assert.ok(cloud.includes('runs-on: ubuntu-latest'));
  assert.ok(cloud.includes('VIBE2_BRANCH: vibe2-unreal-core'));
  assert.ok(cloud.includes('origin/$VIBE2_BRANCH:.vibe2/queue.json'));
  assert.ok(cloud.includes('pwa-command-vibe2-task.mjs" ingest'));
  assert.ok(cloud.includes('gh workflow run vibe2-continuous-core.yml'));
  assert.ok(cloud.includes('COMPANY_OIDC_TOKEN'));
  assert.ok(!cloud.includes('WEB_VIBE_GH_TOKEN'));
  assert.ok(!cloud.includes('11435'));
  assert.ok(!cloud.includes('web-vibe-organization.mjs'));
  assert.ok(local.includes("github.event_name == 'repository_dispatch'"));
  assert.ok(local.includes("github.event_name == 'issue_comment'"));
  assert.ok(local.includes('WEB_VIBE_EXECUTION=DEDICATED_LOCAL_ENGINE_REQUIRED'));
  assert.ok(local.includes('web-vibe-organization.mjs" ingest'));
  assert.ok(!local.includes('gh workflow run'));
  assert.ok(!local.includes('vibe2-unreal-core'));
});

test('local-only issue comment remains independent while authenticated dispatch runs in the cloud',()=>{
  const source=fs.readFileSync('.github/workflows/pwa-command-bridge.yml','utf8');
  const local=source.slice(source.indexOf('  bridge:'),source.indexOf('  github-cloud:'));
  const cloud=source.slice(source.indexOf('  github-cloud:'),source.indexOf('  web-cloud-onepatch:'));
  assert.ok(cloud.includes("steps.next.outputs.has_work == 'true'"));
  assert.ok(!cloud.includes('steps.local.outputs'));
  assert.ok(local.includes("steps.local.outputs.has_work == 'true'"));
  assert.ok(!local.includes('steps.next.outputs'));
  const native=fs.readFileSync('.github/workflows/company-owner-web-edit-propagation.yml','utf8');
  assert.ok(!native.includes('gh workflow run company-development-roblox-runtime.yml'));
  assert.ok(!native.includes('gh workflow run company-development-unity-runtime.yml'));
});


test('Github-hosted WEB_VIBE_1 onepatch uses its own queue and existing bridge, not native workers',()=>{
  const yml=fs.readFileSync('.github/workflows/pwa-command-bridge.yml','utf8');
  const worker=fs.readFileSync('tools/web-vibe-worker.mjs','utf8');
  const cloud=yml.slice(yml.indexOf('  web-cloud-onepatch:'));
  assert.ok(cloud.startsWith('  web-cloud-onepatch:'));
  assert.match(cloud,/needs: bridge/);
  assert.match(cloud,/github.event_name == 'issue_comment'/);
  assert.match(cloud,/github.event_name == 'repository_dispatch'/);
  assert.match(cloud,/WEB_VIBE_GH_TOKEN: \$\{\{ secrets.WEB_VIBE_GH_TOKEN \}\}/);
  assert.match(cloud,/GEMINI_API_KEY: \$\{\{ secrets.GEMINI_API_KEY \}\}/);
  assert.match(cloud,/web-vibe-worker.mjs/);
  assert.match(cloud,/--cloud --apply --pr/);
  assert.match(cloud,/persist-credentials: false/);
  assert.doesNotMatch(cloud,/vibe2-unreal-core|roblox-games\/|unity-games\/|gh workflow run|cloudflare/i);
  assert.match(worker,/\['issue_comment','repository_dispatch'\]/);
  assert.match(worker,/GITHUB_REPOSITORY!==REPO/);
  assert.match(worker,/WEB_VIBE_DEDICATED_TOKEN_REQUIRED/);
  assert.match(worker,/requestGeminiFreePair/);
  assert.doesNotMatch(cloud,/OLLAMA_HOST|11435|WEB_VIBE_EXECUTION=DEDICATED_LOCAL_ENGINE_REQUIRED/);
});
