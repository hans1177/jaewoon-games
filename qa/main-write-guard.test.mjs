// 파일명: qa/main-write-guard.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { FINAL_CHAIN_LOCK_PATHS, finalChainLockViolations, isWorkflowPath, scanTextForDirectMainWrite } from '../tools/main-write-guard.mjs';

test('workflow path detector only accepts workflow yaml files',()=>{
  assert.equal(isWorkflowPath('.github/workflows/build.yml'),true);
  assert.equal(isWorkflowPath('.github/workflows/build.yaml'),true);
  assert.equal(isWorkflowPath('tools/build.yml'),false);
});

test('direct main pushes are blocked',()=>{
  const hits=scanTextForDirectMainWrite(`git push origin HEAD:main\ngit push origin main`);
  assert.equal(hits.length,2);
});

test('feature branch pushes remain allowed',()=>{
  const hits=scanTextForDirectMainWrite('git push origin HEAD:autonomous-dev');
  assert.equal(hits.length,0);
});

test('ordinary workflow references to main are not false positives',()=>{
  const hits=scanTextForDirectMainWrite('ref: main\nbranches: [main]\ngit fetch origin main');
  assert.equal(hits.length,0);
});

test('main ref expressions containing inputs are not mistaken for HTTP PUT writes',()=>{
  const line="group: ${{ github.ref == 'refs/heads/main' && inputs.execution_lane || 'game-primary' }}";
  assert.equal(scanTextForDirectMainWrite(line).length,0);
  assert.equal(scanTextForDirectMainWrite('refs/heads/main PUT').length,1);
});

test('main write guard workflow uses shallow partial checkout and exact base fetch',()=>{
  const workflow=fs.readFileSync(new URL('../.github/workflows/main-write-guard.yml',import.meta.url),'utf8');
  assert.match(workflow,/fetch-depth:\s*1/);
  assert.match(workflow,/filter:\s*blob:none/);
  assert.doesNotMatch(workflow,/fetch-depth:\s*0/);
  assert.match(workflow,/git fetch --no-tags --depth=1 origin "\$base_sha"/);
});

test('main write guard falls back to two-point diff when shallow history has no merge base',()=>{
  const source=fs.readFileSync(new URL('../tools/main-write-guard.mjs',import.meta.url),'utf8');
  assert.match(source,/\${baseRef}\.\.\.\${headRef}/);
  assert.match(source,/\['diff','--name-only',baseRef,headRef\]/);
});


test('main write guard skips its own unit suite when only unrelated workflow files changed',()=>{
  const workflow=fs.readFileSync(new URL('../.github/workflows/main-write-guard.yml',import.meta.url),'utf8');
  assert.match(workflow,/Detect guard implementation change/);
  assert.match(workflow,/guard_changed=NO/);
  assert.match(workflow,/tools\/main-write-guard\\.mjs\|qa\/main-write-guard\\.test\\.mjs\|\\.github\/workflows\/main-write-guard\\.yml/);
  assert.match(workflow,/if: \$\{\{ steps\.scope\.outputs\.guard_changed == 'YES' \}\}/);
  assert.match(workflow,/Reject new workflow direct writes to main/);
});


test('final chain lock blocks only locked pipeline files and leaves game source development open',()=>{
  const lock={status:'LOCKED',lockedPaths:FINAL_CHAIN_LOCK_PATHS};
  const hits=finalChainLockViolations({
    files:['tools/company-build-up-directive.mjs','roblox-games/demo/server/Game.server.luau'],
    lock,actor:'github-actions[bot]',owner:'hans1177'
  });
  assert.deepEqual(hits.map(row=>row.file),['tools/company-build-up-directive.mjs']);
});

test('final chain lock owner unlock requires both repository owner actor and explicit title token',()=>{
  const lock={status:'LOCKED',lockedPaths:FINAL_CHAIN_LOCK_PATHS};
  assert.equal(finalChainLockViolations({
    files:['tools/company-build-up-directive.mjs'],lock,actor:'hans1177',owner:'hans1177',unlockTitle:'[OWNER_UNLOCK] pipeline repair'
  }).length,0);
  assert.equal(finalChainLockViolations({
    files:['tools/company-build-up-directive.mjs'],lock,actor:'other-user',owner:'hans1177',unlockTitle:'[OWNER_UNLOCK] pipeline repair'
  }).length,1);
});

test('main write guard watches final locked chain without watching ordinary game source',()=>{
  const workflow=fs.readFileSync(new URL('../.github/workflows/main-write-guard.yml',import.meta.url),'utf8');
  assert.match(workflow,/company-learning\/platform-release-roadmap\.json/);
  assert.match(workflow,/tools\/company-build-up-directive\.mjs/);
  assert.match(workflow,/company-development-roblox-post-runtime-qa\.yml/);
  assert.match(workflow,/--unlock-title=/);
  assert.doesNotMatch(workflow,/roblox-games\/\*\*/);
});


test('main write guard recovers merged owner-unlock PR title on push without weakening actor checks',()=>{
  const workflow=fs.readFileSync(new URL('../.github/workflows/main-write-guard.yml',import.meta.url),'utf8');
  assert.match(workflow,/pull-requests:\s*read/);
  assert.match(workflow,/EVENT_NAME: \$\{\{ github\.event_name \}\}/);
  assert.match(workflow,/HEAD_SHA: \$\{\{ github\.sha \}\}/);
  assert.match(workflow,/commits\/\$HEAD_SHA\/pulls\?per_page=20/);
  assert.match(workflow,/unlock_title="\$PR_TITLE"/);
  assert.match(workflow,/--unlock-title="\$unlock_title"/);
  assert.match(workflow,/MAIN_WRITE_GUARD_UNLOCK_METADATA=ASSOCIATED_PR_OR_EVENT/);
  assert.match(workflow,/if \[ "\$EVENT_NAME" = 'push' \] && \[ -z "\$unlock_title" \]/);
});
