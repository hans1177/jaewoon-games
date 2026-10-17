// 외부 알고리즘/제작 도구는 기존 Vibe2 에셋 제작 책임 경로에서만 사용한다.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  VIBE_EXTERNAL_CUSTOMIZATION_REFERENCES,
  planVibeExternalCustomization
} from '../assets/asset-selector.js';

const scope={
  authority:'OWNER_DIRECTIVE_2026-10-17_ROBLOX_AND_GENERAL_WEB',
  status:'ACTIVE',existingPipelineOnly:true,activeTargets:['ROBLOX','WEB'],
  ownerHeldTargets:['UNITY_WEB','UNITY_ANDROID','FORTNITE_UEFN']
};
const approved='sha256:'+'a'.repeat(64);
const validSource={
  id:'verified-stone',family:'TERRAIN',path:'assets/terrain.glb',
  sourceHash:'b'.repeat(64),license:'CC0-1.0',verifiedCompanyReusable:true
};
const input={
  gameId:'canyon-survival',request:'바위협곡 지형 동굴 몬스터와 마을 건물, 금속 재질',
  requirements:[{family:'TERRAIN',role:'canyon'},{family:'CREATURE',role:'monster'}],
  styleBible:{profileKey:'STYLIZED_FANTASY'},
  assets:[validSource,
    {...validSource,id:'no-licence',license:'CC-BY-NC'},
    {...validSource,id:'no-hash',sourceHash:''},
    {...validSource,id:'prepared-only',verifiedCompanyReusable:false},
    {...validSource,id:'blocked',securityBlocked:true},
    {...validSource,id:'unknown',license:''}
  ],
  sourceRevision:'c'.repeat(40),ownerScope:scope,approvedDesignFingerprint:approved
};

test('catalog describes all approved external references without executable download commands',()=>{
  assert.deepEqual(VIBE_EXTERNAL_CUSTOMIZATION_REFERENCES.map(row=>row.id),[
    'FASTNOISELITE','WAVE_FUNCTION_COLLAPSE','ASTAR_PATHFINDING','BLENDER',
    'MATERIAL_MAKER','GLTF_TRANSFORM','KENNEY_ASSET_REFERENCE'
  ]);
  for(const row of VIBE_EXTERNAL_CUSTOMIZATION_REFERENCES){
    assert.match(row.sourceUrl,/^https:\/\//);
    assert.ok(row.owner&&row.integration&&row.licenseReviewRequired);
  }
});

test('native Roblox uses approved design and verified library assets before any external authoring',()=>{
  const plan=planVibeExternalCustomization({...input,target:'roblox'});
  assert.equal(plan.target,'ROBLOX');
  assert.equal(plan.authorized,true);
  assert.equal(plan.status,'EXISTING_ASSET_PRODUCTION_HANDOFF_REQUIRED');
  assert.equal(plan.designFingerprint,approved);
  assert.equal(plan.existingVerifiedSourceCount,1);
  const noise=plan.references.find(row=>row.id==='FASTNOISELITE');
  assert.ok(noise.roles.includes('TERRAIN'));
  assert.equal(noise.existingVerifiedSourceCount,1);
  assert.deepEqual(noise.sourceCandidates.map(row=>row.assetId),['verified-stone']);
  const derived=noise.sourceCandidates[0].derivative;
  assert.equal(derived.sourceAssetId,'verified-stone');
  assert.equal(derived.designFingerprint,approved);
  assert.equal(derived.approvedStyleProfile,'STYLIZED_FANTASY');
  assert.equal(derived.status,'NATIVE_AUTHORING_SOURCE_REVIEW_REQUIRED');
  assert.equal(derived.createdArtifact,false);
  assert.equal(derived.gameplayAuthority,false);
  assert.ok(derived.visualAxes.includes('MATERIAL_RESPONSE'));
  assert.equal(noise.status,'EXISTING_OWNER_ALGORITHM_REVIEW_REQUIRED');
  assert.equal(plan.references.find(row=>row.id==='BLENDER').externalExecutionPerformed,false);
  assert.equal(plan.sourceMutationPerformed,false);
  assert.equal(plan.appliedToGame,false);
  assert.equal(plan.qaPassed,false);
  assert.deepEqual(plan.applicationOrder.slice(0,2),[
    'REUSE_VERIFIED_LIBRARY','DERIVE_APPROVED_NATIVE_VARIANT'
  ]);
});

test('ordinary browser Web is authorized without giving Unity Web any authority',()=>{
  for(const target of ['web','general-web','browser']){
    const plan=planVibeExternalCustomization({...input,target});
    assert.equal(plan.target,'WEB');
    assert.equal(plan.authorized,true);
    assert.equal(plan.nativeRuntimeVerified,false);
  }
  for(const options of [
    {target:'WEB',sourceRoot:'unity-games/survival/Assets'},
    {target:'WEB',executionSurface:'UNITY_WEB'},
    {target:'WEB',executionSurface:'UNITY_ANDROID'},
    {target:'WEB',unityWebDevelopment:true}
  ]){
    const held=planVibeExternalCustomization({...input,...options});
    assert.equal(held.authorized,false,JSON.stringify(options));
    assert.equal(held.target,'UNITY_WEB');
  }
  for(const target of ['unity-web','unity','unity-android','fortnite-uefn','UEFN','']){
    const plan=planVibeExternalCustomization({...input,target});
    assert.equal(plan.authorized,false,target);
    assert.equal(plan.status,'OWNER_POLICY_HELD');
    assert.ok(plan.references.every(row=>row.status==='OWNER_POLICY_HELD'));
  }
});

test('fail closed when central approval, a design, or explicit target is missing',()=>{
  assert.equal(planVibeExternalCustomization({...input,ownerScope:null,target:'WEB'}).authorized,false);
  assert.equal(planVibeExternalCustomization({...input,ownerScope:{...scope,status:'INACTIVE'},target:'ROBLOX'}).authorized,false);
  assert.equal(planVibeExternalCustomization({...input,ownerScope:{...scope,existingPipelineOnly:false},target:'WEB'}).authorized,false);
  const noDesign=planVibeExternalCustomization({...input,approvedDesignFingerprint:'',target:'ROBLOX'});
  assert.equal(noDesign.status,'APPROVED_GAME_DESIGN_REQUIRED');
  assert.ok(noDesign.references.filter(row=>row.roles.length).every(row=>row.status==='APPROVED_GAME_DESIGN_REQUIRED'));
  const held=planVibeExternalCustomization({...input,ownerScope:{...scope,ownerHeldTargets:['WEB']},target:'WEB'});
  assert.equal(held.authorized,false);
});

test('no invention of game mechanics and no tool executions masquerade as verified',()=>{
  const plan=planVibeExternalCustomization({...input,target:'WEB'});
  assert.ok(plan.references.every(row=>row.gameSourceModified===false&&row.nativeRuntimeVerified===false));
  assert.equal(plan.externalInstallRequiresExplicitAuthorization,true);
  assert.equal(plan.newQueueOrShadowPipelineCreated,false);
  for(const semantic of ['CORE_RULES','BALANCE','PROGRESSION','SAVE_KEYS','SERVER_AUTHORITY']){
    assert.ok(plan.preserved.includes(semantic));
  }
});
