import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRobloxBuildEvidence,resolvePackageSourceValidation,ROBLOX_PACKAGE_TOOL} from '../tools/company-development-roblox-package.mjs';

test('Roblox package evidence proves build only and never invents later validation',()=>{
  const evidence=createRobloxBuildEvidence({
    gameId:'seed-roblox-test',
    sourcePath:'roblox-games/seed-roblox-test',
    sourceRevision:'a'.repeat(40),
    artifactPath:'/tmp/seed-roblox-test.rbxlx',
    artifactSha256:'b'.repeat(64),
    sourceValidationPassed:true,
    saveRequired:true,
  });
  assert.equal(evidence.buildOrPackagePassed,true);
  assert.equal(evidence.artifactIdentity,`sha256:${'b'.repeat(64)}`);
  assert.equal(evidence.luauOrSourceValidationPassed,true);
  assert.equal(evidence.buildPreflightPassed,false);
  assert.equal(evidence.runtimePassed,false);
  assert.equal(evidence.independentQaPassed,false);
  assert.equal(evidence.regressionPassed,false);
  assert.equal(evidence.finalReviewPassed,false);
  assert.equal(evidence.lastSuccessfulStage,'TARGET_PLATFORM_BUILD_OR_PACKAGE');
  assert.equal(evidence.failureStage,'FIVE_DISTINCT_LEAD_BUILD_PREFLIGHT');
  assert.equal(evidence.failureSignature,'ROBLOX_BUILD_PREFLIGHT_PENDING');
  assert.equal(evidence.releaseClaim,false);
});

test('Roblox package source validation keeps ordinary static blockers authoritative',()=>{
  const validation=resolvePackageSourceValidation({
    staticVerdict:{pass:false,blockers:['CLIENT_SERVER_ACTION_REQUIRED'],saveRequired:false},
  });
  assert.equal(validation.pass,false);
  assert.deepEqual(validation.blockers,['CLIENT_SERVER_ACTION_REQUIRED']);
  assert.equal(validation.authority,'exact-source-static-validation');
});

test('Roblox package source validation accepts an exact verified Vibe2 source tree without weakening ordinary validation',()=>{
  const tree='c'.repeat(40);
  const validation=resolvePackageSourceValidation({
    staticVerdict:{pass:false,blockers:['CLIENT_SERVER_ACTION_REQUIRED'],saveRequired:false},
    verifiedSourceTreeSha:tree,
    actualSourceTreeSha:tree,
  });
  assert.equal(validation.pass,true);
  assert.deepEqual(validation.blockers,[]);
  assert.equal(validation.authority,'verified-vibe2-source-handoff');
});

test('Roblox package source validation rejects a verified Vibe2 handoff when the exact source tree differs',()=>{
  const validation=resolvePackageSourceValidation({
    staticVerdict:{pass:true,blockers:[],saveRequired:false},
    verifiedSourceTreeSha:'c'.repeat(40),
    actualSourceTreeSha:'d'.repeat(40),
  });
  assert.equal(validation.pass,false);
  assert.deepEqual(validation.blockers,['VIBE2_VERIFIED_HANDOFF_SOURCE_TREE_MISMATCH']);
  assert.equal(validation.authority,'verified-vibe2-source-handoff');
});

test('Roblox package toolchain is pinned to the verified Rojo Linux artifact',()=>{
  assert.equal(ROBLOX_PACKAGE_TOOL.rojoVersion,'7.7.0');
  assert.equal(ROBLOX_PACKAGE_TOOL.linuxX64Asset,'rojo-7.7.0-linux-x86_64.zip');
  assert.equal(ROBLOX_PACKAGE_TOOL.linuxX64AssetSha256,'22503e5839864f9d7c2171c48b536fc229f2cc4d8774c9cc149f60941d864073');
});

test('canonical Roblox workflow contains build package checkpoint and keeps full review pending',()=>{
  const workflow=fs.readFileSync(new URL('../.github/workflows/company-development-roblox-runtime.yml',import.meta.url),'utf8');
  assert.match(workflow,/technical-plan:/);
  assert.match(workflow,/technical-worker:/);
  assert.match(workflow,/technical-persist:/);
  assert.match(workflow,/company-development-roblox-package\.mjs/);
  assert.match(workflow,/rojo-7\.7\.0-linux-x86_64\.zip/);
  assert.match(workflow,/22503e5839864f9d7c2171c48b536fc229f2cc4d8774c9cc149f60941d864073/);
  assert.match(workflow,/ROBLOX_BUILD_PREFLIGHT_PASS=NO/);
  assert.match(workflow,/ROBLOX_RUNTIME_PASS=NO/);
  assert.match(workflow,/ROBLOX_FINAL_REVIEW_PASS=NO/);
});
