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


test('non-dungeon and non-NPC map genres do not request WFC or A-star solely because a map exists',()=>{
  const approvedDesign={coreLoop:'레이싱 경주용 트랙과 체크포인트 및 기록'};
  const plan=planVibeExternalCustomization({
    ...input,gameId:'race-track',request:'맵에 트랙 배치',requirements:[],
    approvedDesign,approvedDesignFingerprint:approved,target:'WEB',
    assets:[],sourceRoot:'web-games/race-track'
  });
  assert.equal(plan.contentComposition.authorized,true);
  assert.ok(plan.contentComposition.designDeclaredCapabilities.some(row=>row.id==='RACING_OR_MOVEMENT'));
  for(const id of ['WAVE_FUNCTION_COLLAPSE','ASTAR_PATHFINDING']){
    const tool=plan.references.find(row=>row.id===id);
    assert.deepEqual(tool.roles,[]);
    assert.equal(tool.status,'NOT_REQUIRED_BY_CURRENT_GAME');
    assert.equal(tool.nextAction,'NONE');
  }
});

test('native A-star derives deterministic paths from server-approved grids without gameplay authority',async()=>{
  const {JaewoonCommonAI}=await import('../assets/common-ai.js');
  const ai=new JaewoonCommonAI({role:JaewoonCommonAI.Role.MELEE});
  const input={engineApproved:true,movementAuthorized:true,width:5,height:5,
    start:{x:0,z:0},goal:{x:4,z:0},
    blockedCells:[{x:1,z:0},{x:1,z:1},{x:1,z:2}]};
  const first=ai.planPath(input),second=ai.planPath(input);
  assert.equal(first.status,'PATH_FOUND');
  assert.deepEqual(first,second,'reproducible obstacle-aware route');
  assert.deepEqual(first.cells[0],{x:0,z:0});
  assert.deepEqual(first.cells.at(-1),{x:4,z:0});
  assert.equal(first.cells.some(cell=>input.blockedCells.some(b=>b.x===cell.x&&b.z===cell.z)),false);
  assert.equal(first.gameplayAuthority,false);
  assert.equal(first.runtimeVerified,false);
  assert.equal(ai.planPath({...input,blockedCells:[] ,engineApproved:false}).status,'ENGINE_APPROVAL_REQUIRED');
  assert.equal(ai.planPath({...input,blockedCells:[{x:4,z:0}]}).status,'START_OR_GOAL_BLOCKED');
  assert.equal(ai.planPath({...input,blockedCells:[{x:1,z:0},{x:1,z:1},{x:1,z:2},{x:1,z:3},{x:1,z:4}]}).status,'NO_ROUTE');
  assert.equal(ai.planPath({...input,maxExplored:1}).status,'SEARCH_BUDGET_EXCEEDED');
  assert.equal(ai.planPath({...input,width:100,height:100}).status,'NAVIGATION_INPUT_INVALID');
});

test('enemy search binds only approved route proposals without changing attacks or source targets',async()=>{
  const {JaewoonCommonAI}=await import('../assets/common-ai.js');
  const ai=new JaewoonCommonAI({role:JaewoonCommonAI.Role.MELEE});
  const enemy=Object.freeze({id:'approved-monster',distance:9,threat:1,hpRatio:1,x:4,z:0});
  const context={entityKind:'monster',hpRatio:1,danger:0,enemies:[enemy],
    navigation:{engineApproved:true,movementAuthorized:true,width:5,height:5,
      start:{x:0,z:0},blockedCells:[{x:1,z:0}]}};
  const search=ai.decide(context);
  assert.equal(search.state,JaewoonCommonAI.State.SEARCH);
  assert.equal(search.targetId,enemy.id);
  assert.equal(search.target.routeProposal.status,'PATH_FOUND');
  assert.equal(search.gameplayAuthority,false);
  assert.equal(enemy.routeProposal,undefined,'existing enemy data is never mutated');
  const denied=ai.decide({...context,navigation:{...context.navigation,engineApproved:false}});
  assert.equal(denied.state,search.state);
  assert.equal(denied.target.routeProposal,undefined);
  const near=ai.decide({...context,enemies:[{...enemy,distance:1}]});
  assert.equal(near.state,JaewoonCommonAI.State.ATTACK,'existing attack-range behavior remains intact');
});

test('approved canyon uses the existing seeded terrain owner, not an unexecuted FastNoiseLite binary',async()=>{
  const {createVibeProceduralWorldLayout}=await import('../assets/vibe-environment-director.js');
  const geometry={approved:true,kind:'CANYON',depth:.22,halfWidth:.18,meander:.1};
  const input={seed:'approved-canyon',width:12,height:12,dimension:'3D',gameId:'canyon-survival',
    target:'ROBLOX',approvedDesign:true,terrainMorphology:geometry};
  const a=createVibeProceduralWorldLayout(input);
  const b=createVibeProceduralWorldLayout(input);
  const old=createVibeProceduralWorldLayout({...input,terrainMorphology:null});
  assert.equal(a.terrain.length,144);
  assert.deepEqual(a,b,'identical seed and approved terrain must reproduce the same geometry');
  assert.ok(a.terrain.some((tile,i)=>tile.elevation!==old.terrain[i].elevation));
  assert.ok(a.terrain.every(tile=>tile.elevation>=.05 && tile.elevation<=.95));
  assert.equal(a.terrainMorphology.externalFastNoiseLiteExecuted,false);
  assert.equal(a.terrainMorphology.appliedToNativeGame,false);
  assert.equal(a.gameplayRuleMutation,false);
  assert.equal(a.saveMeaningMutation,false);
  assert.equal(createVibeProceduralWorldLayout({...input,terrainMorphology:{...geometry,approved:false}}).status,'INVALID_GENERATION_INPUT');
  assert.equal(createVibeProceduralWorldLayout({...input,terrainMorphology:{...geometry,depth:.7}}).status,'INVALID_GENERATION_INPUT');
});


test('approved optional WFC room graph enforces socket adjacency and reachable start-to-exit',async()=>{
  const {createVibeProceduralWorldLayout}=await import('../assets/vibe-environment-director.js');
  const opts={seed:'room-connectivity',width:12,height:12,approvedDesign:true,target:'WEB'};
  const rooms={approved:true,width:3,height:3,closedBoundary:false,
    start:{x:0,z:0},exit:{x:2,z:2},tiles:[{id:'open',open:['N','E','S','W']}]};
  const result=createVibeProceduralWorldLayout({...opts,roomConstraints:rooms});
  const second=createVibeProceduralWorldLayout({...opts,roomConstraints:rooms});
  assert.deepEqual(result,second,'same seed and designer sockets reproduce');
  assert.equal(result.roomComposition.status,'ROOM_LAYOUT_STATIC_PROPOSAL');
  assert.equal(result.roomComposition.cells.length,9);
  assert.equal(result.roomComposition.route.length,5);
  assert.deepEqual(result.roomComposition.route[0],rooms.start);
  assert.deepEqual(result.roomComposition.route.at(-1),rooms.exit);
  assert.equal(result.roomComposition.gameplayAuthority,false);
  assert.equal(result.roomComposition.runtimeVerified,false);
  assert.equal(result.sourceMutationPerformed,false);
  assert.equal(result.saveMeaningMutation,false);
  const impossible=createVibeProceduralWorldLayout({...opts,
    roomConstraints:{...rooms,tiles:[{id:'sealed',open:[]}]}});
  assert.equal(impossible.roomComposition.status,'ROOM_CONSTRAINT_UNSATISFIABLE');
  assert.ok(impossible.issues.includes('ROOM_CONSTRAINT_UNSATISFIABLE'));
  assert.equal(createVibeProceduralWorldLayout({...opts,
    roomConstraints:{...rooms,approved:false}}).roomComposition.status,'ROOM_CONSTRAINT_INPUT_OR_APPROVAL_INVALID');
  assert.equal(createVibeProceduralWorldLayout({...opts,
    roomConstraints:{...rooms,fixedCells:[{x:1,z:1,tileId:'missing'}]}})
    .roomComposition.status,'ROOM_CONSTRAINT_INPUT_OR_APPROVAL_INVALID');
  assert.equal('roomComposition' in createVibeProceduralWorldLayout(opts),false,
    'genres without explicit room design are unchanged');
});
