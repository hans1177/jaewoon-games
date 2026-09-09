import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync('tools/artbook-prepare-daily.mjs','utf8');

test('idle queue persistence is actions-only and queue-scoped',()=>{
  assert.match(source,/process\.env\.GITHUB_ACTIONS!==['"]true['"]/);
  assert.match(source,/git\(\['add','--','artbook-submission-queue\.json'\]\)/);
  assert.match(source,/git\(\['commit','-m','artbook: persist idle queue state \[skip ci\]'\]\)/);
  assert.match(source,/git\(\['pull','--rebase','origin','main'\]\)/);
  assert.match(source,/git\(\['push','origin','HEAD:main'\]\)/);
});

test('idle persistence runs only after no-work queue state is written',()=>{
  const idleWrite=source.indexOf("writeJson('artbook-submission-queue.json',queue);",source.indexOf("if(!gameId)"));
  const persist=source.indexOf('persistIdleQueueIfActions();');
  const exit=source.indexOf('process.exit(0);',persist);
  assert.ok(idleWrite>=0&&persist>idleWrite&&exit>persist);
});

test('existing lifecycle stage mappings remain intact',()=>{
  assert.match(source,/mode==='DEVELOPMENT_UPGRADE'\?'artbook-development-upgrade'/);
  assert.match(source,/mode==='RELEASE_UPGRADE'\?'artbook-release-upgrade'/);
});
