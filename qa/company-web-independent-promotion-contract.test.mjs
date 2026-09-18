import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync('tools/company-development-web-gameplay-validation.mjs','utf8');

test('90+ Web promotion needs independent revalidation with matching hashes',()=>{
  assert.match(source,/web-promotion-revalidation\.json/);
  assert.match(source,/sourceHashMatch/);
  assert.match(source,/baselineHashMatch/);
  assert.match(source,/formalImplementationPassed=promotionPass/);
});


test('web and native share competitive quality parity and web pass is not release-ready by itself',()=>{
  const roadmap=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
  const directive=JSON.parse(fs.readFileSync('company-learning/other-ai-machine-directive.json','utf8'));
  assert.equal(roadmap.webCompanion.continuouslyEditableDuringDevelopment,true);
  assert.equal(roadmap.webCompanion.competitiveQualityParityWithNative,true);
  assert.equal(roadmap.webCompanion.competitiveQualityContract,'tools/company-common-development-quality-contract.mjs');
  assert.equal(roadmap.webCompanion.runtimePassIsReleaseSignal,false);
  assert.equal(roadmap.webCompanion.singleWebPassCannotTriggerRelease,true);
  assert.equal(roadmap.developmentLifecycleMachine.releaseMaturityGate.prematureReleaseForbidden,true);
  assert.equal(roadmap.developmentLifecycleMachine.releaseMaturityGate.requiresCompetitiveQualityParity,true);
  assert.equal(directive.developmentLifecycle.webFirst.competitiveQualityParityWithNative,true);
  assert.equal(directive.developmentLifecycle.webFirst.webPassIsReleaseSignal,false);
  assert.equal(directive.developmentLifecycle.nativeSecondStage.competitiveQualityParityWithWeb,true);
  assert.equal(directive.developmentLifecycle.releaseMaturity.singlePassInsufficient,true);
});
