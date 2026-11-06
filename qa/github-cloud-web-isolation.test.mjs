import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('original PWA polling retains its existing cloud queue while local chat uses WEB-only queue',()=>{
  const source=fs.readFileSync('.github/workflows/pwa-command-bridge.yml','utf8');
  const localStart=source.indexOf('  bridge:'),cloudStart=source.indexOf('  github-cloud:');
  assert.ok(localStart>0&&cloudStart>localStart);
  const local=source.slice(localStart,cloudStart),cloud=source.slice(cloudStart,source.indexOf('  web-recovery-select:'));
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
  const cloud=source.slice(source.indexOf('  github-cloud:'),source.indexOf('  web-recovery-select:'));
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
  assert.match(cloud,/WEB_VIBE_GH_TOKEN: \$\{\{ secrets.WEB_VIBE_GH_TOKEN \|\| github.token \}\}/);
  assert.match(cloud,/GEMINI_API_KEY: \$\{\{ secrets.GEMINI_API_KEY \}\}/);
  assert.match(cloud,/contents: write\s+pull-requests: write/);
  assert.doesNotMatch(cloud,/test -n \"\$GEMINI_API_KEY\"/);
  assert.match(worker,/draft=cloud&&process.env.WEB_VIBE_JOB_TOKEN==='true'/);
  assert.match(worker,/draft\?\['--draft'\]/);
  assert.match(cloud,/web-vibe-worker.mjs/);
  assert.match(cloud,/node tools\/company-constitution-enforcer\.mjs --phase=worker-before-source-write/);
  assert.match(cloud,/--cloud --apply --pr/);
  assert.match(cloud,/persist-credentials: false/);
  assert.doesNotMatch(cloud,/vibe2-unreal-core|roblox-games\/|unity-games\/|gh workflow run|cloudflare/i);
  assert.match(worker,/\['issue_comment','repository_dispatch'\]/);
  assert.match(worker,/GITHUB_REPOSITORY!==REPO/);
  assert.match(worker,/WEB_VIBE_DEDICATED_TOKEN_REQUIRED/);
  assert.match(worker,/requestGeminiFreePair/);
  assert.doesNotMatch(cloud,/OLLAMA_HOST|11435|WEB_VIBE_EXECUTION=DEDICATED_LOCAL_ENGINE_REQUIRED/);
});

// 회귀: 상태 동기화에 과거 큐/자산 이력 전체를 다운로드하지 않는다.
test('existing PWA fetches current control snapshots without unbounded history',()=>{
  const source=fs.readFileSync('.github/workflows/pwa-command-bridge.yml','utf8');
  const fetches=source.split('\n').filter(line=>line.trim().startsWith('git fetch '));
  assert.equal(fetches.length,3);
  for(const line of fetches){
    assert.match(line,/git fetch --depth=1 --filter=blob:none origin/);
    assert.doesNotMatch(line,/--unshallow|--tags/);
  }
  assert.match(source,/git show "origin\/\$VIBE2_BRANCH:\.vibe2\/queue\.json"/);
  assert.match(source,/storage-unpack --queue="\$work\/\.vibe2\/queue\.json"/);
  assert.match(source,/storage-pack --queue=\.vibe2\/queue\.json/);
});

// 회귀: 기존 무료 전환 경로는 WEB 두 실행부에도 전달하며 무료 요금제 확인을 만들어내지 않는다.
test('WEB owner and recovery lanes bind existing free provider rotation without assumed billing approval',()=>{
  const source=fs.readFileSync('.github/workflows/pwa-command-bridge.yml','utf8');
  for(const job of ['web-recovery-onepatch','web-cloud-onepatch']){
    const block=source.slice(source.indexOf('  '+job+':')).split(/\n  [a-z][a-z-]+:/)[0];
    assert.match(block,/GROQ_API_KEY: \$\{\{ secrets\.GROQ_API_KEY \}\}/);
    assert.match(block,/OPENROUTER_API_KEY: \$\{\{ secrets\.OPENROUTER_API_KEY \}\}/);
    assert.match(block,/VIBE2_EXTERNAL_FREE_ROTATION: 'YES'/);
    assert.match(block,/VIBE2_GROQ_FREE_PLAN_VERIFIED: \$\{\{ vars\.VIBE2_GROQ_FREE_PLAN_VERIFIED \}\}/);
    assert.doesNotMatch(block,/VIBE2_GROQ_FREE_PLAN_VERIFIED:.*\|\|/);
  }
});
