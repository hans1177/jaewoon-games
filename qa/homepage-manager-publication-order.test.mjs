import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const workflow=fs.readFileSync('.github/workflows/homepage-manager.yml','utf8');
const directive=JSON.parse(fs.readFileSync('company-directive.json','utf8'));
const homepagePolicy=directive.homepageOperations||{};
const manager=fs.readFileSync('tools/homepage-manager.mjs','utf8');
const testSync=fs.readFileSync('tools/homepage-test-candidate-sync.mjs','utf8');
const artbookTool=fs.readFileSync('tools/company-design-artbook.mjs','utf8');
const homepageEntry=fs.readFileSync('assets/homepage-enhancements.js','utf8');
const homepageCore=fs.readFileSync('assets/homepage-enhancements-core.js','utf8');
const legacyHomepagePolicyMirror=['HOMEPAGE','OPERATIONS.md'].join('_');

const section=(from,to)=>{
  const start=workflow.indexOf(from);
  const end=to?workflow.indexOf(to,start+from.length):workflow.length;
  assert.notEqual(start,-1,`missing section: ${from}`);
  assert.ok(end>start,`invalid section boundary: ${from}`);
  return workflow.slice(start,end);
};

const collectPolicyTextFiles=(root='.')=>{
  const allowed=/\.(?:mjs|cjs|js|json|ya?ml|md|html|css|txt)$/i;
  const ignored=new Set(['.git','node_modules','.wrangler','.cache']);
  const files=[];
  const walk=dir=>{
    for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
      if(ignored.has(entry.name))continue;
      const full=path.join(dir,entry.name);
      if(entry.isDirectory())walk(full);
      else if(allowed.test(entry.name))files.push(full);
    }
  };
  walk(root);
  return files;
};

test('legacy homepage policy mirror stays deleted and unreferenced',()=>{
  assert.equal(fs.existsSync(legacyHomepagePolicyMirror),false);
  const offenders=collectPolicyTextFiles().filter(file=>fs.readFileSync(file,'utf8').includes(legacyHomepagePolicyMirror));
  assert.deepEqual(offenders,[]);
  assert.equal(directive.policyDocument,'COMPANY_FLOW.md');
  assert.equal(homepagePolicy.mode,'SINGLE_MANAGER_WITH_SINGLE_POST_WORK_SUPERVISOR');
});

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

test('development games auto-display from runtime progress while Top30 promotion stays separately gated',()=>{
  const progress=homepagePolicy.developmentProgressDisplay||{};
  assert.equal(progress.source,'COMPANY_RUNTIME_DEVELOPMENT_QUEUE');
  assert.equal(progress.autoRegisterProductionClass,'DEVELOPMENT_CONFIRMED');
  assert.equal(progress.requiresHomepageTestEligible,false);
  assert.equal(progress.separateFromTop30Promotion,true);
  assert.equal(progress.ranking,'SCORE_DESC');
  assert.ok(homepageCore.includes('const developmentItems=queue=>'));
  assert.ok(homepageCore.includes("productionClass||'').trim().toUpperCase()==='DEVELOPMENT_CONFIRMED'"));
  assert.ok(homepageCore.includes("getJson('/development-queue.json',{runtime:true})"));
  assert.ok(homepageCore.includes("wrapper.id='homeDevelopmentGameCenter'"));
  assert.ok(homepageCore.includes('const developmentScoreState=row=>'));
  assert.ok(homepageCore.includes('const developmentScoreOf=row=>developmentScoreState(row).score'));
  assert.ok(homepageCore.includes('webInitialCycleStrictScore'));
  assert.ok(homepageCore.includes('webInitialCyclePassed===true'));
  assert.ok(homepageCore.includes('webInitialCycleValidationSchemaVersion'));
  assert.ok(homepageCore.includes('webInitialCycleMusicValidationPassed===true'));
  assert.ok(homepageCore.includes("revalidation?'재검증 필요'"));
  assert.ok(homepageCore.includes('if(sb!==sa)return sb-sa'));
  assert.ok(homepageCore.includes('data-development-score='));
  assert.ok(homepageCore.includes('점수 미평가'));
  assert.ok(homepageCore.includes('const developmentWebTestTarget=item=>'));
  assert.ok(homepageCore.includes('const developmentPlatformTestTarget=(item,status)=>'));
  assert.ok(homepageCore.includes('data-development-web-test=\"true\"'));
  assert.ok(homepageCore.includes('data-development-platform-test='));
  assert.ok(homepageCore.includes('status?.testBuilds'));
  assert.ok(homepageCore.includes('웹 테스트'));
  assert.ok(homepageCore.includes('테스트 준비 중'));
  assert.ok(homepageCore.includes('class="foldGameCard developmentGameCard"'));
  assert.ok(homepageCore.includes('data-homepage-game-source="DEVELOPMENT_QUEUE"'));
  const devFilter=homepageCore.slice(homepageCore.indexOf('const developmentItems=queue=>'),homepageCore.indexOf('const developmentStateLabel='));
  assert.ok(!devFilter.includes('homepageTestEligible'));
  assert.ok(homepageCore.includes('const TOP30_LIMIT=30;'));
  assert.ok(homepageCore.includes('const TOP30_MIN_SCORE=80;'));
  assert.ok(homepageCore.includes("getJson('/test-game-candidates.json')"));
  assert.ok(homepageCore.includes("wrapper.id='homeTop30GameCenter'"));
  assert.ok(homepageCore.includes('data-homepage-game-source="CANONICAL_TOP30"'));
  assert.ok(homepageEntry.includes("card.dataset?.homepageGameSource==='DEVELOPMENT_QUEUE'"));
  assert.ok(homepageEntry.includes("card.dataset?.homepageGameSource==='CANONICAL_TOP30'"));
  assert.ok(manager.includes('HOMEPAGE_DEVELOPMENT_SOURCE=DEVELOPMENT_QUEUE'));
  assert.ok(manager.includes('HOMEPAGE_DEVELOPMENT_VISIBILITY=PROGRESS_ONLY'));
  assert.ok(manager.includes('HOMEPAGE_DEVELOPMENT_ORDER=SCORE_DESC'));
  assert.ok(manager.includes('HOMEPAGE_DEVELOPMENT_SCORE_VISIBLE=YES'));
  assert.ok(manager.includes('HOMEPAGE_DEVELOPMENT_SCORE_SOURCE=CURRENT_INITIAL_CYCLE'));
  assert.ok(manager.includes('HOMEPAGE_DEVELOPMENT_STALE_SCORE_POLICY=REVALIDATION_NOT_CURRENT'));
  assert.ok(manager.includes('HOMEPAGE_DEVELOPMENT_TEST_BUTTONS=WEB_AND_PLATFORM'));
  assert.ok(manager.includes('HOMEPAGE_TOP30_SOURCE=CANONICAL_TOP30'));
});

test('APK install control is relocated away from the homepage top without deleting install contracts',()=>{
  assert.equal(homepagePolicy?.fixedFunctionProtection?.ownerLocked,true);
  assert.ok(homepagePolicy?.fixedFunctionProtection?.protectedFunctions?.includes('PWA_APP_INSTALL_AND_OFFLINE_RUNTIME'));
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

test('Top30 canonical sync is semantic-idempotent and does not create timestamp-only churn',()=>{
  assert.ok(testSync.includes('const semanticJson=value=>'));
  assert.ok(testSync.includes('delete copy.updatedAt;'));
  assert.ok(testSync.includes('const writeJsonIfSemanticChanged='));
  assert.ok(testSync.includes('HOMEPAGE_TEST_SYNC_NOOP='));
  assert.ok(testSync.includes('HOMEPAGE_TEST_SYNC_CHANGED='));
  assert.ok(!testSync.includes('registry.updatedAt=new Date().toISOString()'));
  assert.ok(!testSync.includes('version:5,updatedAt:new Date().toISOString()'));
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
});

test('workflow implements machine-contract self-QA -> Director -> live confirmation order',()=>{
  assert.deepEqual(homepagePolicy.afterWorkFlow,[
    'HOMEPAGE_MANAGER_APPLY',
    'HOMEPAGE_MANAGER_SELF_QA',
    'DIRECTOR_SINGLE_POST_WORK_SUPERVISION',
    'LIVE_STATUS_CONFIRMATION'
  ]);
  assert.equal(homepagePolicy.managerCount,1);
  assert.equal(homepagePolicy.supervisorCount,1);
  assert.equal(homepagePolicy.secondHomepageManagerForbidden,true);
  assert.equal(homepagePolicy.secondHomepageSupervisorForbidden,true);
  const manage=section('  manage-and-self-qa:','  director-supervision:');
  const director=section('  director-supervision:','  publish-after-director:');
  const publish=section('  publish-after-director:');
  assert.ok(manage.includes('Capture exact self-QA candidate'));
  assert.ok(director.includes('Verify and apply exact self-QA candidate'));
  assert.ok(publish.includes('Verify and apply Director-approved candidate'));
});
