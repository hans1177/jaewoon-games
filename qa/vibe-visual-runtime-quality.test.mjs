// 파일명: qa/vibe-visual-runtime-quality.test.mjs
// 역할: 기존 Vibe 그래픽 파이프의 에셋 확보 순서·Golden Scene·primitive lifecycle·visual debt 계약 검증
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createVibeArtPipeline,
  createVibeAssetAcquisitionPlan,
  createVibeVisualDebtEntry,
  VIBE_ASSET_ACQUISITION_ORDER,
  VIBE_GOLDEN_SCENE_ROLES,
} from '../assets/vibe-art-pipeline.js';
import {
  auditVibeGoldenSceneEvidence,
  auditVibeRuntimeVisualEvidence,
  assertVibeRuntimeVisualQuality,
  GOLDEN_SCENE_ROLES,
} from '../assets/vibe-visual-quality-gate.js';

function captures(revision='a'.repeat(40)){
  return GOLDEN_SCENE_ROLES.map((role,index)=>({
    role,
    source:'roblox-runtime-capture',
    artifactId:`capture-${index+1}`,
    candidateRevision:revision,
    observed:true,
    reviewed:true,
    comparison:{pass:true},
  }));
}

test('art pipeline uses verified asset acquisition before primitive fallback and requires golden scenes',()=>{
  const plan=createVibeArtPipeline({request:'로블록스 카툰 캐릭터 그래픽 고퀄 개선',target:'roblox',quality:2});
  assert.deepEqual([...plan.assetAcquisition.order],[...VIBE_ASSET_ACQUISITION_ORDER]);
  assert.equal(plan.assetAcquisition.primitiveFallbackPrototypeOnly,true);
  assert.equal(plan.runtimeVisualAcceptance.actualRuntimeCaptureRequired,true);
  assert.deepEqual([...plan.runtimeVisualAcceptance.goldenSceneRoles],[...VIBE_GOLDEN_SCENE_ROLES]);
  assert.equal(plan.policy.goldenSceneRuntimeEvidenceRequired,true);
  assert.equal(plan.policy.markerOnlyPresentationPassForbidden,true);
});

test('asset acquisition prefers existing verified company assets and keeps primitive fallback prototype-only',()=>{
  const company=[{id:'verified-cartoon-rig'}];
  const plan=createVibeAssetAcquisitionPlan({companyAssets:company,repositoryAssets:[{id:'repo'}],stage:'INTERNAL_PLAYTEST'});
  assert.equal(plan.selectedSource,'VERIFIED_COMPANY_ASSET_AND_RIG_LIBRARY');
  assert.equal(plan.candidates[0].id,'verified-cartoon-rig');
  assert.equal(plan.primitiveFallbackAllowed,false);
  assert.equal(plan.primitiveFallbackCreatesVisualDebt,true);
});

test('golden scene audit requires all five actual reviewed runtime captures',()=>{
  const revision='b'.repeat(40);
  const pass=auditVibeGoldenSceneEvidence({candidateRevision:revision,captures:captures(revision)});
  assert.equal(pass.pass,true);
  const missing=auditVibeGoldenSceneEvidence({candidateRevision:revision,captures:captures(revision).slice(0,4)});
  assert.equal(missing.pass,false);
  assert.equal(missing.missing.length,1);
  const marker=captures(revision);
  marker[0]={...marker[0],source:'source-marker',markerOnly:true};
  assert.equal(auditVibeGoldenSceneEvidence({candidateRevision:revision,captures:marker}).pass,false);
});

test('internal playtest rejects unapproved primitive primary actors even with golden scenes',()=>{
  const revision='c'.repeat(40);
  const result=auditVibeRuntimeVisualEvidence({
    stage:'INTERNAL_PLAYTEST',
    candidateRevision:revision,
    captures:captures(revision),
    primaryActors:[
      {id:'player',presentation:'rigged-mesh'},
      {id:'wolf',presentation:'primitive-placeholder',placeholder:true},
    ],
  });
  assert.equal(result.pass,false);
  assert.deepEqual([...result.primitiveViolations],['wolf']);
  assert.throws(()=>assertVibeRuntimeVisualQuality({
    stage:'INTERNAL_PLAYTEST',
    candidateRevision:revision,
    captures:captures(revision),
    primaryActors:[{id:'wolf',presentation:'part-placeholder'}],
  }),/런타임 그래픽 품질 게이트 차단/);
});

test('final graphics cannot pass with unresolved high visual debt',()=>{
  const revision='d'.repeat(40);
  const debt=createVibeVisualDebtEntry({id:'wolf-placeholder',role:'enemy',reason:'temporary primitive'});
  const result=auditVibeRuntimeVisualEvidence({
    stage:'FINAL',
    candidateRevision:revision,
    captures:captures(revision),
    primaryActors:[{id:'player',presentation:'rigged-mesh'},{id:'wolf',presentation:'mesh'}],
    visualDebt:[debt],
  });
  assert.equal(result.pass,false);
  assert.ok(result.reasons.includes('unresolved-critical-visual-debt'));
});
