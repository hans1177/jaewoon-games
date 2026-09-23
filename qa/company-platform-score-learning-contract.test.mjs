import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const learning=JSON.parse(fs.readFileSync('company-learning/canonical-learning-pipeline.json','utf8'));
const vibe3=JSON.parse(fs.readFileSync('company-learning/vibe3-engine-contract.json','utf8'));
const playbooks=JSON.parse(fs.readFileSync('company-learning/vibe3-task-playbooks.json','utf8'));

test('platform learning is evidence-driven and keeps Roblox and Unity platform signals distinct',()=>{
  const dual=learning.dualNativeLearning;
  assert.equal(dual.platformEvidenceIndependent,true);
  assert.equal(dual.onePlatformEvidenceCannotSatisfyOtherPlatformRuntimeGate,true);
  assert.ok(dual.platformSpecificPatterns.ROBLOX.includes('ROBLOX_SERVER_AUTHORITY'));
  assert.ok(dual.platformSpecificPatterns.ROBLOX.includes('ROBLOX_REPLICATION'));
  assert.ok(dual.platformSpecificPatterns.UNITY.includes('UNITY_SCENE_PREFAB_ARCHITECTURE'));
  assert.ok(dual.platformSpecificPatterns.UNITY.includes('UNITY_ANDROID_PERFORMANCE_MEMORY_THERMAL'));
  assert.equal(dual.verifiedPatternsFeedSharedV3Memory,true);
});

test('portable Web context cannot become native verified evidence or a shadow learning lane',()=>{
  const web=learning.portableWebLearning;
  assert.equal(web.enabled,false);
  assert.equal(web.webEvidenceCountsAsRobloxVerifiedEvidence,false);
  assert.equal(web.webEvidenceMaySatisfyRobloxRuntimeOrPublishingGate,false);
  assert.equal(web.separateCronOrPipelineAllowed,false);
  assert.equal(vibe3.verifiedRag.positiveMemoryRequiresVerifiedEvidence,true);
  assert.equal(vibe3.verifiedRag.platformPassEvidenceMayNotTransfer,true);
  assert.equal(playbooks.directNativePlatformContext.platformEvidenceIndependent,true);
  assert.equal(playbooks.directNativePlatformContext.unityWebNativeGateAuthority,false);
});
