import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow=fs.readFileSync('.github/workflows/homepage-manager.yml','utf8');
const directive=JSON.parse(fs.readFileSync('company-directive.json','utf8'));
const roadmap=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
const manager=fs.readFileSync('tools/homepage-manager.mjs','utf8');
const testSync=fs.readFileSync('tools/homepage-test-candidate-sync.mjs','utf8');
const artbookTool=fs.readFileSync('tools/company-design-artbook.mjs','utf8');
const homepage=fs.readFileSync('assets/homepage-enhancements.js','utf8');
const contract=fs.readFileSync('tools/company-web-validation-evidence-contract.mjs','utf8');
const legacyHomepagePolicyMirror=['HOMEPAGE','OPERATIONS.md'].join('_');

const section=(from,to)=>{
  const start=workflow.indexOf(from);
  const end=to?workflow.indexOf(to,start+from.length):workflow.length;
  assert.notEqual(start,-1,`missing section: ${from}`);
  assert.ok(end>start,`invalid section boundary: ${from}`);
  return workflow.slice(start,end);
};

test('legacy homepage policy mirror stays removed and machine roadmap remains authoritative',()=>{
  assert.equal(fs.existsSync(legacyHomepagePolicyMirror),false);
  assert.equal(directive.policyDocument,'company-learning/platform-release-roadmap.json');
  assert.equal(roadmap.authority,'MACHINE_EXECUTION_CONTRACT');
  assert.equal(roadmap.legacyPolicyMirror.authoritative,false);
});

test('Director supervises the exact Homepage Manager candidate before publication',()=>{
  const manage=section('  manage-and-self-qa:','  director-supervision:');
  const director=section('  director-supervision:','  publish-after-director:');
  const publish=section('  publish-after-director:');
  assert.ok(manage.includes('Capture exact self-QA candidate'));
  assert.ok(manage.includes('actions/upload-artifact@v4'));
  assert.ok(manage.includes('homepage-candidate.patch'));
  assert.ok(director.includes('needs: manage-and-self-qa'));
  assert.ok(director.includes('actions/download-artifact@v4'));
  assert.ok(director.includes('Verify and apply exact self-QA candidate'));
  assert.ok(director.includes('sha256sum'));
  assert.ok(publish.includes('needs: [manage-and-self-qa, director-supervision]'));
  assert.ok(publish.includes('Verify and apply Director-approved candidate'));
  assert.ok(publish.includes('gh pr create'));
  assert.ok(publish.includes('gh pr merge'));
});

test('verified runtime status and catalog join the same supervised publication candidate',()=>{
  const manage=section('  manage-and-self-qa:','  director-supervision:');
  const publish=section('  publish-after-director:');
  for(const file of ['company-status.json','game-catalog.json','test-game-candidates.json','game-artbooks.json']){
    assert.ok(manage.includes(file),`candidate capture missing ${file}`);
    assert.ok(publish.includes(file),`publication missing ${file}`);
  }
  assert.ok(manage.includes('Prepare verified runtime status/catalog candidate'));
  assert.ok(manage.includes('HOMEPAGE_PUBLIC_STATUS_SYNC=YES'));
});

test('homepage renders canonical verified server shelves from one current enhancement entry',()=>{
  assert.equal(fs.existsSync('assets/homepage-enhancements-core.js'),false);
  assert.match(homepage,/const SYNC_INTERVAL_MS=5000/);
  assert.match(homepage,/getJson\('\/game-catalog\.json'\)/);
  assert.match(homepage,/getJson\('\/company-status\.json'\)/);
  assert.match(homepage,/getJson\('\/test-game-candidates\.json'\)/);
  assert.match(homepage,/runtimeInfoAuthority!=='company-runtime'/);
  assert.match(homepage,/runtimeAuthority!=='company-runtime'/);
  assert.match(homepage,/const displayEligible=row=>\['RELEASE_CONFIRMED','DEVELOPMENT_CONFIRMED'\]/);
  assert.match(homepage,/function releaseRows\(catalog,status\)/);
  assert.match(homepage,/function developmentRows\(catalog,status\)/);
  assert.match(homepage,/function homepageRows\(catalog,status,testManifest=\{\}\)/);
  assert.match(homepage,/testManifest\?\.candidates/);
  assert.match(homepage,/TOP30_STRICT_IMPLEMENTATION_SCORE/);
  assert.match(homepage,/const scoreState=row=>/);
  assert.match(homepage,/function buildFocus\(catalog,status,testManifest=\{\}\)/);
  assert.match(homepage,/function buildGameCenter\(catalog,status,testManifest=\{\}\)/);
  assert.match(homepage,/buildShelf\(hub,'homeReleaseGameCenter'/);
  assert.match(homepage,/buildShelf\(hub,'homeTop30GameCenter'/);
  assert.match(homepage,/buildShelf\(hub,'homeDevelopmentGameCenter'/);
  assert.match(homepage,/const TOP_LIMIT=30/);
  assert.match(homepage,/homeServerAuthority/);
  assert.match(homepage,/homeSupportedPlatforms/);
  assert.match(homepage,/homeProgressAuthority='company-runtime'/);
});

test('homepage platform and touch launch paths stay bound to verified runtime data',()=>{
  assert.match(homepage,/function latestVerifiedUnityBuilds\(status\)/);
  assert.match(homepage,/signatureVerified!==true/);
  assert.match(homepage,/runtimePassed/);
  assert.match(homepage,/function platformHref\(game\)/);
  assert.match(homepage,/p==='ROBLOX'/);
  assert.match(homepage,/p==='FORTNITE_UEFN'/);
  assert.match(homepage,/unityBuildUrl/);
  assert.match(homepage,/function bindDirectGameLaunch\(\)/);
  assert.match(homepage,/data-direct-play|dataset\.directPlay/);
  assert.match(homepage,/dataset\.touchLaunch='true'/);
});

test('post-Web artbook binding follows current Web validation schema without blocking platform development',()=>{
  assert.match(contract,/WEB_VALIDATION_SCHEMA_VERSION=15/);
  assert.match(artbookTool,/WEB_VALIDATION_SCHEMA_VERSION/);
  assert.match(artbookTool,/validationSchemaVersion\|\|webEvidence\?\.version\)===WEB_VALIDATION_SCHEMA_VERSION/);
  assert.doesNotMatch(artbookTool,/validationSchemaVersion\|\|webEvidence\?\.version\)===13/);
  const development=fs.readFileSync('.github/workflows/company-development-confirmed-runtime.yml','utf8');
  assert.match(development,/\n  route:\n[\s\S]{0,600}needs: \[web-gate\]/);
  assert.doesNotMatch(development,/\n  route:\n[\s\S]{0,600}needs: \[web-gate, post-web-artbook\]/);
  assert.match(development,/ARTBOOK_FAILURE_ONLY_BLOCKS_HOMEPAGE=YES/);
  assert.match(development,/POST_WEB_ARTBOOK_FAILURE_NATIVE_BLOCK=NO/);
});

test('Top30 canonical sync remains semantic-idempotent and current-schema evidence bound',()=>{
  assert.match(testSync,/const minimumValidationSchema=WEB_VALIDATION_SCHEMA_VERSION/);
  assert.match(testSync,/evaluateWebValidationEvidence/);
  assert.match(testSync,/requireFinalContentDepth:true/);
  assert.match(testSync,/const semanticJson=value=>/);
  assert.match(testSync,/delete copy\.updatedAt/);
  assert.match(testSync,/const writeJsonIfSemanticChanged=/);
  assert.match(testSync,/HOMEPAGE_TEST_SYNC_NOOP=/);
  assert.match(testSync,/HOMEPAGE_TEST_SYNC_CHANGED=/);
});

test('PR creation failure remains a blocking publication failure',()=>{
  const publish=section('  publish-after-director:');
  assert.ok(publish.includes('HOMEPAGE_PUBLICATION_BRANCH_READY=$branch'));
  assert.ok(publish.includes('HOMEPAGE_PUBLICATION=BLOCKED_PR_PERMISSION_REQUIRED'));
  assert.ok(publish.includes('exit 1'));
});

test('current development score policy requires Web schema15 and rejects schema13',()=>{
  const display=directive.homepageOperations?.developmentProgressDisplay||{};
  assert.equal(display.scoreRequiresSchema15,true);
  assert.equal(Object.hasOwn(display,'scoreRequiresSchema13'),false);
  assert.equal(roadmap.authority,'MACHINE_EXECUTION_CONTRACT');
});

test('homepage manager keeps machine self-QA and one post-work Director supervisor',()=>{
  const policy=directive.homepageOperations||{};
  assert.equal(policy.mode,'SINGLE_MANAGER_WITH_SINGLE_POST_WORK_SUPERVISOR');
  assert.equal(policy.managerCount,1);
  assert.equal(policy.supervisorCount,1);
  assert.equal(policy.secondHomepageManagerForbidden,true);
  assert.equal(policy.secondHomepageSupervisorForbidden,true);
  assert.match(manager,/HOMEPAGE_MANAGER_COUNT=1/);
  assert.match(manager,/HOMEPAGE_POST_WORK_SUPERVISOR_COUNT=1/);
});
