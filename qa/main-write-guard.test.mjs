// 파일명: qa/main-write-guard.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
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
