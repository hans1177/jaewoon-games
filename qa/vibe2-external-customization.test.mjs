// 외부 알고리즘/제작 도구는 기존 Vibe2 에셋 제작 책임 경로에서만 사용한다.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  VIBE_EXTERNAL_CUSTOMIZATION_REFERENCES,
  VIBE_UNIVERSAL_CONTENT_CAPABILITIES,
  planVibeUniversalComposition,
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


test('F0-to-F9 approved housing and raid build includes saved ownership, wave navigation and room connectivity',()=>{
  const approvedDesign={
    coreLoop:'협곡 지형 탐험, 집을 지어 하우징 꾸미고, 밤마다 몬스터 습격 방어',
    spatialLayout:{rooms:['지하 던전 방 배치','시작점','출구'],biome:'바위협곡'},
    signatureSystems:[{name:'하우징',enabled:true},{name:'습격',enabled:true}]
  };
  const plan=planVibeUniversalComposition({
    approvedDesign,designFingerprint:approved,gameId:'canyon-survival',
    target:'WEB',ownerScope:scope,sourceRoot:'web-games/canyon-survival',
    sourceRevision:'c'.repeat(40)
  });
  assert.equal(plan.authorized,true);
  assert.equal(plan.genreRestriction,'NONE');
  assert.equal(plan.floorOrDungeonMandatory,false);
  assert.deepEqual(plan.designDeclaredCapabilities.filter(row=>
    ['SPACE_OR_WORLD','FLOOR_OR_ROOM','HOUSING','RAID_OR_SIEGE'].includes(row.id)
  ).map(row=>row.id),['SPACE_OR_WORLD','FLOOR_OR_ROOM','HOUSING','RAID_OR_SIEGE']);
  const housing=plan.designDeclaredCapabilities.find(row=>row.id==='HOUSING');
  assert.ok(housing.validation.includes('OWNER_PERMISSION_AND_SERVER_AUTHORITY'));
  assert.ok(housing.validation.includes('SAVE_AND_REJOIN'));
  assert.ok(housing.validation.includes('CANCEL_AND_ROLLBACK'));
  const raid=plan.designDeclaredCapabilities.find(row=>row.id==='RAID_OR_SIEGE');
  assert.ok(raid.validation.includes('ACTUAL_NAVIGATION_AND_SAFE_SPAWN'));
  assert.ok(raid.validation.includes('REWARD_AND_RETRY_IDEMPOTENCY'));
  assert.ok(raid.validation.includes('DISCONNECT_AND_EVENT_CLEANUP'));
  assert.equal(plan.f0.proofState,'NOT_EXECUTED');
  assert.equal(plan.expansion.executed,false);
  assert.equal(plan.f9.pass,false);
  assert.equal(plan.runtimeVerified,false);
  assert.equal(plan.appliedToGame,false);
  const combined=planVibeExternalCustomization({
    ...input,target:'web',approvedDesign,
    sourceRoot:'web-games/canyon-survival'
  });
  assert.equal(combined.contentComposition.authorized,true);
  assert.ok(combined.roles.includes('DUNGEON'));
  assert.ok(combined.roles.includes('BUILDING'));
  assert.ok(combined.roles.includes('ENEMY_AI'));
  assert.ok(combined.roles.includes('MATERIAL'));
  assert.ok(combined.references.find(row=>row.id==='WAVE_FUNCTION_COLLAPSE').roles.includes('DUNGEON'));
  assert.ok(combined.references.find(row=>row.id==='BLENDER').roles.includes('BUILDING'));
  assert.ok(combined.references.find(row=>row.id==='FASTNOISELITE').roles.includes('TERRAIN'));
  assert.ok(combined.references.find(row=>row.id==='ASTAR_PATHFINDING').roles.includes('ENEMY_AI'));
});

test('game genre never invents housing, raiding, floor or 3D world requirements',()=>{
  assert.ok(VIBE_UNIVERSAL_CONTENT_CAPABILITIES.length>=10);
  for(const [genre,design,required] of [
    ['chess',{coreLoop:'체스 말 턴 진행, 합법적인 이동, 승패 처리'},[]],
    ['racing',{coreLoop:'레이싱 트랙 주행 및 랩 타임 기록'},['RACING_OR_MOVEMENT']],
    ['puzzle',{coreLoop:'퍼즐 상태 전환, 힌트와 해법 검증'},['PUZZLE_OR_ADVENTURE']],
    ['social',{coreLoop:'소셜 아바타 커스터마이징, 채팅'},['SOCIAL_OR_CREATIVE']],
    ['tycoon',{coreLoop:'타이쿤 경영과 생산 수익'},['ECONOMY_OR_SIMULATION']]
  ]){
    const plan=planVibeUniversalComposition({approvedDesign:design,designFingerprint:approved,
      gameId:genre,target:'ROBLOX',ownerScope:scope,sourceRoot:'roblox-games/'+genre});
    assert.equal(plan.authorized,true,genre);
    assert.ok(plan.f0.checks.includes('REAL_PLAYER_INPUT_AND_OBSERVABLE_RESULT'));
    const capabilities=plan.designDeclaredCapabilities.map(row=>row.id);
    for(const feature of required)assert.ok(capabilities.includes(feature),genre+':'+feature);
    assert.ok(!capabilities.includes('HOUSING'),genre);
    assert.ok(!capabilities.includes('RAID_OR_SIEGE'),genre);
    assert.ok(!capabilities.includes('FLOOR_OR_ROOM'),genre);
  }
});

test('disabled design features and unapproved user hints cannot authorize housing or raiding',()=>{
  const design={
    coreLoop:'체스 판 위 규칙에 따라 이동',signatureSystems:[
      {name:'하우징',enabled:false},{name:'습격',status:'DISABLED'}
    ]
  };
  const approvedPlan=planVibeUniversalComposition({approvedDesign:design,
    designFingerprint:approved,gameId:'chess',target:'WEB',ownerScope:scope});
  assert.ok(!approvedPlan.designDeclaredCapabilities.some(row=>['HOUSING','RAID_OR_SIEGE'].includes(row.id)));
  const hintsOnly=planVibeExternalCustomization({...input,target:'ROBLOX',
    request:'하우징 습격 99개 플로어를 무조건 만들어',
    approvedDesign:null
  });
  assert.equal(hintsOnly.contentComposition.authorized,false);
  assert.equal(hintsOnly.contentComposition.status,'APPROVED_GAME_DESIGN_REQUIRED');
  assert.deepEqual(hintsOnly.contentComposition.designDeclaredCapabilities,[]);
});

test('unapproved platform and Unity-Web disguised as ordinary Web block every content stage',()=>{
  const design={coreLoop:'하우징을 건설하고 습격을 방어한다'};
  for(const config of [
    {target:'WEB',ownerScope:null},
    {target:'UNITY_WEB',ownerScope:scope},
    {target:'WEB',ownerScope:scope,sourceRoot:'unity-games/dungeon/Assets'},
    {target:'WEB',ownerScope:scope,executionSurface:'UNITY_ANDROID'},
    {target:'WEB',ownerScope:{...scope,status:'SUSPENDED'}},
    {target:'WEB',ownerScope:scope,designFingerprint:'NOT_A_SHA256'}
  ]){
    const plan=planVibeUniversalComposition({approvedDesign:design,designFingerprint:approved,
      gameId:'housing-raid',...config});
    assert.equal(plan.authorized,false,JSON.stringify(config));
    assert.equal(plan.f9.pass,false);
    assert.equal(plan.runtimeVerified,false);
  }
});

test('existing Vibe2 production emits approved composition guidance with explicit F0 and F9 evidence, not a new worker',()=>{
  const source=fs.readFileSync('tools/vibe2-asset-production-plan.mjs','utf8');
  assert.match(source,/approvedDesign:verifiedDesign/);
  assert.match(source,/plan\.externalCustomization\?\.contentComposition\?\.authorized/);
  assert.match(source,/\[ALL-GENRE EXISTING F0-F9 CONTENT COMPOSITION\]/);
  assert.match(source,/planVibeExternalCustomization/);
});
