import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow=fs.readFileSync('.github/workflows/homepage-manager.yml','utf8');
const operations=fs.readFileSync('HOMEPAGE_OPERATIONS.md','utf8');
const manager=fs.readFileSync('tools/homepage-manager.mjs','utf8');
const testSync=fs.readFileSync('tools/homepage-test-candidate-sync.mjs','utf8');
const artbookTool=fs.readFileSync('tools/company-design-artbook.mjs','utf8');
const homepageEntry=fs.readFileSync('assets/homepage-enhancements.js','utf8');
const homepageCore=fs.readFileSync('assets/homepage-enhancements-core.js','utf8');

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

test('homepage primary game implementation is canonical Top30, not the legacy catalog',()=>{
  assert.ok(operations.includes('홈페이지 게임 구현 = Top30'));
  assert.ok(operations.includes('홈페이지의 **주 게임 구현 영역은 canonical Web Top30 그 자체**'));
  assert.ok(homepageCore.includes('const TOP30_LIMIT=30;'));
  assert.ok(homepageCore.includes('const TOP30_MIN_SCORE=80;'));
  assert.ok(homepageCore.includes("getJson('/test-game-candidates.json')"));
  assert.ok(homepageCore.includes("wrapper.id='homeTop30GameCenter'"));
  assert.ok(homepageCore.includes('class="foldGameCard top30GameCard"'));
  assert.ok(homepageCore.includes('data-homepage-game-source="CANONICAL_TOP30"'));
  assert.ok(homepageCore.includes("homePrimaryGameSource='CANONICAL_TOP30'"));
  assert.ok(homepageEntry.includes("card.classList.contains('top30GameCard')"));
  assert.ok(homepageEntry.includes("card.dataset?.homepageGameSource==='CANONICAL_TOP30'"));
  assert.ok(!homepageEntry.includes('renderCompactTestShelf'));
  assert.ok(manager.includes('HOMEPAGE_PRIMARY_GAME_SOURCE=CANONICAL_TOP30'));
});

test('APK install control is relocated away from the homepage top without deleting install contracts',()=>{
  assert.ok(operations.includes('APK 설치 배치'));
  assert.ok(operations.includes('홈페이지 대문 상단에 두지 않는다'));
  assert.ok(homepageEntry.includes("document.getElementById('appInstallBar')"));
  assert.ok(homepageEntry.includes("document.querySelector('.teamPanel .teamWrap')"));
  assert.ok(homepageEntry.includes('teamWrap.appendChild(bar)'));
  assert.ok(homepageEntry.includes("bar.dataset.placement='company-team-bottom'"));
  assert.ok(homepageEntry.includes("window.location.href='/downloads/jaewoon-company.apk'"));
  assert.ok(manager.includes('apkInstallRelocatedOffTop'));
  assert.ok(manager.includes('HOMEPAGE_APK_INSTALL_PLACEMENT=COMPANY_TEAM_BOTTOM'));
});

test('Top30 test artbooks remain valid before catalog promotion',()=>{
  const manage=section('  manage-and-self-qa:','  director-supervision:');
  assert.ok(manager.includes('const testCandidateIds=new Set('));
  assert.ok(manager.includes('b.homepageTestCandidate===true&&testCandidateIds.has('));
  assert.ok(manage.includes("const tests=JSON.parse(fs.readFileSync('test-game-candidates.json','utf8'));"));
  assert.ok(manage.includes('const testGameIds=new Set('));
  assert.ok(manage.includes('book.homepageTestCandidate===true&&testGameIds.has('));
});

test('post-Web artbook and Top30 both require exact schema13 evidence binding',()=>{
  assert.ok(artbookTool.includes("readJson('development-queue.json',{items:[]})"));
  assert.ok(artbookTool.includes("promotedQueueItem?.productionClass||promotedSeed?.productionClass"));
  assert.ok(!artbookTool.includes("clean(promotedSeed?.productionClass)!=='DEVELOPMENT_CONFIRMED'"));
  assert.ok(artbookTool.includes("POST_WEB_SCHEMA13_DESIGN_BOUND"));
  assert.ok(artbookTool.includes("Number(webEvidence?.validationSchemaVersion||webEvidence?.version)===13"));
  assert.ok(artbookTool.includes("webEvidence?.contentDepthValidation?.validationMode==='REAL_ELAPSED_GAMEPLAY'"));
  assert.ok(artbookTool.includes("clean(webEvidence?.designBaselineSha256)===sha256Text(fs.readFileSync(revisedPath,'utf8'))"));
  assert.ok(artbookTool.includes("DESIGN_ARTBOOK_REQUIRES_APPROVED_DESIGN_BINDING"));
  assert.ok(testSync.includes("item.postWebArtbookPassed!==true"));
  assert.ok(testSync.includes("item.homepageTestCandidate!==true"));
  assert.ok(testSync.includes("clean(item.homepageTestVerdict).toUpperCase()!=='PASS'"));
  assert.ok(testSync.includes("artbook?.postWebStrictReview!==true"));
  assert.ok(testSync.includes("Number(artbook?.webStrictScore)!==scoreOf(evidence)"));
  assert.ok(testSync.includes("clean(artbook?.webValidationEvidencePath)!==evidencePath"));
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
