import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow=fs.readFileSync('.github/workflows/homepage-manager.yml','utf8');
const operations=fs.readFileSync('HOMEPAGE_OPERATIONS.md','utf8');
const manager=fs.readFileSync('tools/homepage-manager.mjs','utf8');
const testSync=fs.readFileSync('tools/homepage-test-candidate-sync.mjs','utf8');

const section=(from,to)=>{
  const start=workflow.indexOf(from);
  const end=to?workflow.indexOf(to,start+from.length):workflow.length;
  assert.notEqual(start,-1,`missing section: ${from}`);
  assert.ok(end>start,`invalid section boundary: ${from}`);
  return workflow.slice(start,end);
};

test('Director supervises the exact Homepage Manager candidate before publication',()=>{
  const manage=section('  manage-and-self-qa:','  director-supervision:');
  const director=section('  director-supervision:','  publish-after-director:');
  const publish=section('  publish-after-director:');

  assert.ok(manage.includes("if: github.event_name != 'workflow_run' || github.event.workflow_run.conclusion == 'success'"));
  assert.ok(manage.includes('Capture exact self-QA candidate'));
  assert.ok(manage.includes('actions/upload-artifact@v4'));
  assert.ok(manage.includes('homepage-candidate.patch'));
  assert.ok(manage.includes('homepage-candidate.json'));
  assert.ok(manage.includes('include-hidden-files: true'));
  assert.ok(!manage.includes('gh pr create'));
  assert.ok(!manage.includes('gh pr merge'));

  assert.ok(director.includes('needs: manage-and-self-qa'));
  assert.ok(director.includes('actions/download-artifact@v4'));
  assert.ok(director.includes('Verify and apply exact self-QA candidate'));
  assert.ok(director.includes('sha256sum'));
  assert.ok(director.includes('git apply --binary'));

  assert.ok(publish.includes('needs: [manage-and-self-qa, director-supervision]'));
  assert.ok(publish.includes("needs.manage-and-self-qa.outputs.candidate_changed == 'true'"));
  assert.ok(publish.includes('actions/download-artifact@v4'));
  assert.ok(publish.includes('Verify and apply Director-approved candidate'));
  assert.ok(publish.includes('gh pr create'));
  assert.ok(publish.includes('gh pr merge'));
});

test('verified runtime status/catalog join the same supervised publication candidate',()=>{
  const manage=section('  manage-and-self-qa:','  director-supervision:');
  const publish=section('  publish-after-director:');
  for(const file of ['company-status.json','game-catalog.json','test-game-candidates.json','game-artbooks.json']){
    assert.ok(manage.includes(file),`candidate capture missing ${file}`);
    assert.ok(publish.includes(file),`publication missing ${file}`);
  }
  assert.ok(manage.includes('${{ github.event.workflow_run.name }}'));
  assert.ok(manage.includes("== 'Company Status Sync'"));
  assert.ok(manage.includes('HOMEPAGE_PUBLIC_STATUS_SYNC=YES'));
  assert.ok(manage.includes('Prepare verified runtime status/catalog candidate'));
});

test('Top30 test artbooks remain valid before catalog promotion',()=>{
  const manage=section('  manage-and-self-qa:','  director-supervision:');
  assert.ok(manager.includes('const testCandidateIds=new Set('));
  assert.ok(manager.includes('b.homepageTestCandidate===true&&testCandidateIds.has('));
  assert.ok(manage.includes("const tests=JSON.parse(fs.readFileSync('test-game-candidates.json','utf8'));"));
  assert.ok(manage.includes('const testGameIds=new Set('));
  assert.ok(manage.includes('book.homepageTestCandidate===true&&testGameIds.has('));
});

test('Top30 mirror sync is semantic-idempotent and does not create timestamp-only churn',()=>{
  assert.ok(testSync.includes('const semanticJson=value=>'));
  assert.ok(testSync.includes('delete copy.updatedAt;'));
  assert.ok(testSync.includes('const writeJsonIfSemanticChanged='));
  assert.ok(testSync.includes('HOMEPAGE_TEST_SYNC_NOOP='));
  assert.ok(testSync.includes('HOMEPAGE_TEST_SYNC_CHANGED='));
  assert.ok(!testSync.includes('registry.updatedAt=new Date().toISOString()'));
  assert.ok(!testSync.includes('version:5,updatedAt:new Date().toISOString()'));
  assert.ok(operations.includes('기존 `updatedAt`을 보존한다'));
  assert.ok(operations.includes('timestamp-only diff'));
  assert.ok(operations.includes('timestamp-only churn'));
});

test('failed upstream events cannot cancel an in-flight supervised homepage candidate',()=>{
  const concurrency=section('concurrency:','env:');
  assert.ok(concurrency.includes("github.event_name == 'workflow_run'"));
  assert.ok(concurrency.includes("github.event.workflow_run.conclusion != 'success'"));
  assert.ok(concurrency.includes('github.run_id || github.ref'));
  assert.ok(concurrency.includes('cancel-in-progress: false'));
  assert.ok(!concurrency.includes('group: homepage-manager-${{ github.ref }}'));
});

test('PR creation failure is a blocking publication failure, not a green branch-ready result',()=>{
  const publish=section('  publish-after-director:');
  assert.ok(publish.includes('HOMEPAGE_PUBLICATION_BRANCH_READY=$branch'));
  assert.ok(publish.includes('HOMEPAGE_PUBLICATION=BLOCKED_PR_PERMISSION_REQUIRED'));
  assert.ok(publish.includes('exit 1'));
  assert.ok(!publish.includes('HOMEPAGE_PUBLICATION=BRANCH_READY_PR_PERMISSION_REQUIRED'));
  assert.ok(operations.includes('PR 생성/병합 권한이 없거나 PR 생성이 실패하면'));
  assert.ok(operations.includes('workflow를 BLOCK/FAIL'));
  assert.ok(operations.includes('`BRANCH_READY`는 완료 증거가 아니다.'));
});

test('workflow implements documented self-QA -> Director -> PR order',()=>{
  const selfQa=operations.indexOf('Homepage Manager self-QA');
  const director=operations.indexOf('기존 Director 1개가 사후 감독');
  const publication=operations.indexOf('자동화 브랜치/PR을 통해 main에 반영');
  assert.ok(selfQa!==-1&&director!==-1&&publication!==-1);
  assert.ok(selfQa<director&&director<publication);
});
