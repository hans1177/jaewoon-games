// 파일명: qa/main-write-guard.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { isWorkflowPath, scanTextForDirectMainWrite } from '../tools/main-write-guard.mjs';

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
