// 파일명: qa/main-write-guard.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { isWorkflowPath, scanTextForDirectMainWrite, scanCentralWorkflowGovernance } from '../tools/main-write-guard.mjs';

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


test('new workflow requires central policy and architecture registration',()=>{
  const file='.github/workflows/random-extra.yml';
  const architecture={workerSynchronization:{launcherWorkflows:[]}};
  const violations=scanCentralWorkflowGovernance({
    changedFiles:[file],
    addedWorkflowFiles:[file],
    architecture,
    readWorkflow:()=> 'name: random\n'
  });
  assert.deepEqual(violations,[
    {file,code:'NEW_WORKFLOW_REQUIRES_CENTRAL_POLICY_AND_ARCHITECTURE_CHANGE'},
    {file,code:'NEW_WORKFLOW_NOT_REGISTERED_IN_CENTRAL_ARCHITECTURE'}
  ]);
});

test('new canonical workflow is allowed only when central topology changes in the same diff',()=>{
  const file='.github/workflows/canonical-new.yml';
  const architecture={workerSynchronization:{launcherWorkflows:[file]}};
  const changedFiles=[
    file,
    'company-learning/platform-release-roadmap.json',
    'company-learning/company-architecture-map.json'
  ];
  const violations=scanCentralWorkflowGovernance({
    changedFiles,
    addedWorkflowFiles:[file],
    architecture,
    readWorkflow:()=> 'run: node tools/company-shared-context.mjs\n'
  });
  assert.deepEqual(violations,[]);
});

test('changed canonical launcher must keep shared central context and cannot revive removed policy mirror',()=>{
  const file='.github/workflows/canonical.yml';
  const architecture={workerSynchronization:{launcherWorkflows:[file]}};
  const missing=scanCentralWorkflowGovernance({
    changedFiles:[file],
    addedWorkflowFiles:[],
    architecture,
    readWorkflow:()=> 'name: canonical\n'
  });
  assert.deepEqual(missing,[{file,code:'CANONICAL_LAUNCHER_MISSING_SHARED_CONTEXT'}]);

  const legacy=scanCentralWorkflowGovernance({
    changedFiles:[file],
    addedWorkflowFiles:[],
    architecture,
    readWorkflow:()=> 'run: node tools/company-shared-context.mjs\n# COMPANY_FLOW.md\n'
  });
  assert.deepEqual(legacy,[{file,code:'REMOVED_HUMAN_POLICY_MIRROR_REFERENCE'}]);
});

test('main write guard detects newly added workflows separately from ordinary changed files',()=>{
  const source=fs.readFileSync(new URL('../tools/main-write-guard.mjs',import.meta.url),'utf8');
  assert.match(source,/--diff-filter=A/);
  assert.match(source,/NEW_WORKFLOW_REQUIRES_CENTRAL_POLICY_AND_ARCHITECTURE_CHANGE/);
  assert.match(source,/NEW_WORKFLOW_NOT_REGISTERED_IN_CENTRAL_ARCHITECTURE/);
  assert.match(source,/CANONICAL_LAUNCHER_MISSING_SHARED_CONTEXT/);
});
