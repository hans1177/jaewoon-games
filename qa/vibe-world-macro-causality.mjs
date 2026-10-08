// 파일명: qa/vibe-world-macro-causality.mjs
// 역할: World LOD/Macro/Fate-Order-Chaos 결정성과 엔진 권한 격리를 회귀 검사
import assert from 'node:assert/strict';
import {resolveVibeWorldLod,createVibeWorldForces,createVibeMacroEventCandidate,createVibeMacroResolutionRequest,resolveVibeMacroCandidate,runVibeMacroResolutionLoop} from '../assets/vibe-orchestrator.js';
import {createVibeGenreWorldGrammar,summarizeVibeVerifiedWorldLearning,distillVibeVerifiedWorldPatterns,createVibeReferenceImageStudyRequest,bindVibeReferenceImageObservation,createVibeReferenceMapAbstraction,createVibeMapDNA,createVibeRouteGraph,createVibeWorldStreamingPlan,createVibeAdaptiveWorldGenerationPlan,createVibeProceduralWorldLayout,planVibeMapAutopilot} from '../assets/vibe-environment-director.js';

assert.equal(resolveVibeWorldLod({distance:0}).level,'micro');
assert.equal(resolveVibeWorldLod({distance:3,relevance:.4}).level,'meso');
assert.equal(resolveVibeWorldLod({distance:10,relevance:.1}).level,'macro');
assert.equal(resolveVibeWorldLod({distance:99,critical:true}).level,'micro');

const forces=createVibeWorldForces({fate:2,order:1,chaos:1});
assert.equal(forces.authority,'macro-influence-only');
assert.ok(Math.abs(forces.fate+forces.order+forces.chaos-1)<.00001);

const input={seed:'world-seed-7',regionId:'north',tick:42,parentEventId:'evt_parent',forces:{fate:.2,order:.5,chaos:.3},pressure:.7,opportunities:[{id:'trade',type:'trade-growth',weight:.8},{id:'storm',type:'storm',weight:.4}]};
const first=createVibeMacroEventCandidate(input),second=createVibeMacroEventCandidate(input);
assert.deepEqual(first,second,'same seeded macro input must be deterministic');
assert.equal(first.authority,'world-intent-candidate-only');
assert.equal(first.engineMustResolve,true);
assert.equal(first.gameplayMutationAllowed,false);
assert.ok(first.causeId.startsWith('cause_'));

const request=createVibeMacroResolutionRequest(first,{context:{worldVersion:3}});
assert.equal(request.authority,'engine-resolution-required');
assert.equal(request.valid,true);
assert.equal(request.causeId,first.causeId);
const resolution=resolveVibeMacroCandidate(request,{accepted:true,outcome:{success:.9,impact:.6,confidence:.8},timestamp:100});
assert.equal(resolution.authority,'engine-resolved');
assert.equal(resolution.event.type,'MACRO_EVENT_RESOLVED');
assert.equal(resolution.event.causeId,first.causeId);
assert.equal(resolution.event.parentEventId,'evt_parent');
assert.equal(resolution.event.locationId,'north');
assert.equal(resolution.event.payload.eventType,first.selected.type);

const waiting=runVibeMacroResolutionLoop(first,{timestamp:100});
assert.equal(waiting.authority,'awaiting-engine-resolution');
assert.equal(waiting.event,null);
const closed=runVibeMacroResolutionLoop(first,{timestamp:100,engineResolve:()=>({accepted:true,outcome:{impact:.5}})});
assert.equal(closed.authority,'closed-engine-macro-loop');
assert.equal(closed.event.authority,'engine-resolved');
assert.equal(closed.event.causeId,first.causeId);

assert.throws(()=>createVibeMacroResolutionRequest({...first,authority:'engine-resolved'}),/macro candidate must require engine resolution/);
assert.throws(()=>createVibeMacroResolutionRequest({...first,gameplayMutationAllowed:true}),/macro candidate must require engine resolution/);
const poisoned={...first,selected:{...first.selected,damage:999}};
const poisonedRequest=createVibeMacroResolutionRequest(poisoned);
assert.equal(poisonedRequest.valid,false);
assert.deepEqual(poisonedRequest.forbiddenFields,['damage']);
assert.throws(()=>resolveVibeMacroCandidate(poisonedRequest,{accepted:true}),/authoritative mutation in macro candidate/);

const imageStudy=createVibeReferenceImageStudyRequest({
  sourceId:'owned-map-ref-1',
  sourceType:'USER_PROVIDED_OR_OWNED_IMAGE',
  imageRef:'references/owned-map.png',
  rights:{owned:true}
});
assert.equal(imageStudy.ready,true);
assert.equal(imageStudy.rawImagePersistentLearningAllowed,false);
assert.equal(imageStudy.directMapLayoutCopyAllowed,false);
const observed=bindVibeReferenceImageObservation({
  request:imageStudy,
  verifiedAgainstSource:true,
  observation:{
    RIDGE_AND_VALLEY_FLOW:'two ridges with a central valley',
    ROAD_AND_PATH_GRAPH:'main switchback with one reconnecting branch',
    OPEN_SPACE_DENSITY:'sparse-open-sparse',
    LANDMARK_HIERARCHY:'temple dominant over village',
    SIGHTLINE_AND_REVEAL:'temple revealed after ridge turn'
  }
});
assert.equal(observed.valid,true);
assert.equal(observed.verifiedAgainstSource,true);
assert.equal(observed.positiveLearningEligible,true);
assert.equal(observed.rawImageStored,false);
const blockedImageStudy=createVibeReferenceImageStudyRequest({
  sourceId:'unverified-ref',
  sourceType:'CLEARLY_LICENSED_REFERENCE',
  imageRef:'references/unverified.png',
  rights:{licenseVerified:false}
});
assert.equal(blockedImageStudy.ready,false);

const reference=createVibeReferenceMapAbstraction({
  sourceType:'USER_PROVIDED_OR_OWNED_IMAGE',
  features:{ridgeValleyFlow:'two ridges one valley',roadPathGraph:'branch-return',landmarkHierarchy:'temple over village',sightlineReveal:'late reveal'}
});
assert.equal(reference.allowed,true);
assert.equal(reference.rawReferenceStored,false);
assert.equal(reference.directLayoutCopyAllowed,false);

const dna=createVibeMapDNA({
  map:{name:'dark-wuxia',biome:'MOUNTAIN',combatOpenness:'mixed'},
  region:{name:'north',history:'fallen sect'},
  concept:{mood:'dark-wuxia'},
  reference
});
assert.equal(dna.fields.BIOME,'MOUNTAIN');
assert.equal(dna.fields.ELEVATION_STYLE,'two ridges one valley');
assert.ok(dna.protected.includes('quest-requirements'));

const routes=createVibeRouteGraph({
  nodes:[
    {id:'gate',role:'spawn'},
    {id:'bridge',role:'landmark'},
    {id:'temple',role:'objective'},
    {id:'cliff',role:'optional',required:false}
  ],
  edges:[
    {from:'gate',to:'bridge',kind:'main'},
    {from:'bridge',to:'temple',kind:'main'}
  ]
});
assert.equal(routes.startNodeId,'gate');
assert.equal(routes.pass,true);
assert.deepEqual([...routes.unreachable],[]);

const blocked=createVibeRouteGraph({
  nodes:[{id:'entry',role:'spawn'},{id:'boss',role:'objective'}],
  edges:[]
});
assert.equal(blocked.pass,false);
assert.ok(blocked.unreachable.includes('boss'));

const streaming=createVibeWorldStreamingPlan({mobile:true});
assert.equal(streaming.initialPlayableZonePrewarm,true);
assert.equal(streaming.literalZeroLoadingClaim,false);
assert.ok(streaming.activeChunkBudget<=9);
assert.equal(streaming.unloadMayNotDiscardSaveOrAuthoritativeWorldState,true);

const rpgGrammar=createVibeGenreWorldGrammar({genre:'ACTION_RPG'});
const survivalGrammar=createVibeGenreWorldGrammar({genre:'SURVIVAL'});
assert.notDeepEqual([...rpgGrammar.routeRoles],[...survivalGrammar.routeRoles]);
assert.equal(rpgGrammar.sameMacroPatternAcrossGenresForbidden,true);

const learning=summarizeVibeVerifiedWorldLearning({events:[
  {type:'ROUTE_USAGE',verifiedRuntimePass:true,count:5},
  {type:'LANDMARK_DISCOVERY',verified:true},
  {type:'STREAMING_HITCH',verifiedRuntimeFailure:true,failureReason:'MOBILE_HITCH'}
]});
assert.equal(learning.stats.routeUsage,5);
assert.equal(learning.stats.landmarkDiscoveries,1);
assert.equal(learning.stats.streamingHitches,1);
assert.equal(learning.positiveLearningEligible,true);
assert.equal(learning.negativeLearningEligible,true);
assert.equal(learning.rawTelemetryDirectTrainingAllowed,false);

const adaptive=createVibeAdaptiveWorldGenerationPlan({
  map:{name:'dark-wuxia',biome:'MOUNTAIN'},
  region:{name:'north'},
  concept:{mood:'dark'},
  reference:{sourceType:'PUBLIC_DOMAIN_IMAGE',features:{roadPathGraph:'switchback'}},
  mobile:true,
  genre:'ACTION_RPG',
  learningEvents:[{type:'ROUTE_USAGE',verifiedRuntimePass:true,count:2}],
  referenceImage:{
    sourceId:'owned-map-ref-2',
    sourceType:'USER_PROVIDED_OR_OWNED_IMAGE',
    imageRef:'references/owned-map-2.png',
    rights:{owned:true},
    verifiedAgainstSource:true,
    observation:{
      RIDGE_AND_VALLEY_FLOW:'stepped ridge',
      ROAD_AND_PATH_GRAPH:'branch-return',
      OPEN_SPACE_DENSITY:'mixed',
      LANDMARK_HIERARCHY:'tower-over-road'
    }
  }
});
assert.equal(adaptive.policy.directReferenceLayoutCopyForbidden,true);
assert.equal(adaptive.policy.gameplayRuleMutation,false);
assert.equal(adaptive.streaming.perceivedSeamlessStreamingTarget,true);
assert.equal(adaptive.genreGrammar.family,'ACTION_RPG');
assert.equal(adaptive.learning.stats.routeUsage,2);
assert.equal(adaptive.referenceImageStudy.observation.valid,true);
assert.equal(adaptive.reference.learningUnit,'VERIFIED_ABSTRACT_STRUCTURAL_TECHNIQUE_ONLY');
assert.equal(adaptive.policy.rawReferencePersistentLearningForbidden,true);
assert.equal(adaptive.referenceImageStudy.request.ready,true);
assert.equal(adaptive.referenceImageStudy.observation.verifiedAgainstSource,true);
assert.equal(adaptive.reference.verifiedAgainstSource,true);
assert.equal(adaptive.policy.rawReferencePersistentLearningForbidden,true);

const mapAuto=planVibeMapAutopilot({
  maps:[{name:'ridge-map',region:'north',biome:'MOUNTAIN'}],
  regions:[{name:'north',biome:'MOUNTAIN'}],
  genre:'ACTION_RPG',
  referenceImagesByMap:{
    'ridge-map':{
      sourceId:'owned-ridge-image',
      sourceType:'USER_PROVIDED_OR_OWNED_IMAGE',
      imageRef:'references/ridge.png',
      rights:{owned:true},
      verifiedAgainstSource:true,
      observation:{
        RIDGE_AND_VALLEY_FLOW:'ridge-valley-ridge',
        ROAD_AND_PATH_GRAPH:'switchback-loop',
        OPEN_SPACE_DENSITY:'tight-open-tight',
        LANDMARK_HIERARCHY:'temple-at-ridge'
      }
    }
  }
});
assert.equal(mapAuto.version,7);
assert.equal(mapAuto.plans[0].adaptiveWorld.referenceImageStudy.request.ready,true);
assert.equal(mapAuto.plans[0].adaptiveWorld.referenceImageStudy.observation.verifiedAgainstSource,true);
assert.equal(mapAuto.policy.referenceImagesSourceBound,true);


const techniqueA={
  GENRE_FAMILY:'ACTION_RPG',
  ROUTE_GRAMMAR:'branch-return-shortcut',
  ENCOUNTER_RHYTHM:'tight-open-tight',
  LANDMARK_REVEAL:'late-ridge-reveal'
};
const oneGame=distillVibeVerifiedWorldPatterns({events:[
  {gameId:'game-a',verifiedRuntimePass:true,outcome:'PASS',technique:techniqueA}
]});
assert.equal(oneGame.reusable.length,0);
assert.equal(oneGame.candidates[0].scope,'GAME_SCOPED_ONLY');

const twoGames=distillVibeVerifiedWorldPatterns({events:[
  {gameId:'game-a',verifiedRuntimePass:true,outcome:'PASS',technique:techniqueA},
  {gameId:'game-b',verifiedRuntimePass:true,outcome:'PASS',technique:techniqueA}
]});
assert.equal(twoGames.reusable.length,1);
assert.equal(twoGames.reusable[0].crossGameReuseEligible,true);
assert.equal(twoGames.reusable[0].verifiedPassGameCount,2);
assert.equal(twoGames.reusable[0].exactCoordinatesStored,false);
assert.equal(twoGames.reusable[0].exactLayoutStored,false);
assert.equal(twoGames.reusable[0].directMasteryCredit,false);

const failureTechnique={
  GENRE_FAMILY:'SURVIVAL',
  ROUTE_GRAMMAR:'single-dead-end',
  ENCOUNTER_RHYTHM:'tight-tight-tight',
  CHOKE_OPEN_SPACE_RHYTHM:'no-release'
};

const sanitizedPattern=distillVibeVerifiedWorldPatterns({events:[
  {gameId:'safe-a',verifiedRuntimePass:true,outcome:'PASS',technique:{
    GENRE_FAMILY:'RPG',
    ROUTE_GRAMMAR:'branch-return',
    LANDMARK_REVEAL:'x=120,y=44 exact tower position',
    SAFE_DANGER_RELATION:'safe-to-risk-gradient'
  }},
  {gameId:'safe-b',verifiedRuntimePass:true,outcome:'PASS',technique:{
    GENRE_FAMILY:'RPG',
    ROUTE_GRAMMAR:'branch-return',
    LANDMARK_REVEAL:'x=120,y=44 exact tower position',
    SAFE_DANGER_RELATION:'safe-to-risk-gradient'
  }}
]});
assert.equal(sanitizedPattern.reusable.length,1);
assert.equal(sanitizedPattern.reusable[0].technique.LANDMARK_REVEAL,undefined);
assert.equal(sanitizedPattern.reusable[0].exactCoordinateLikeValuesRejected,true);
assert.ok(sanitizedPattern.reusable[0].rejectedFieldCount>=1);

const exactOnly=distillVibeVerifiedWorldPatterns({events:[
  {gameId:'exact-a',verifiedRuntimePass:true,outcome:'PASS',technique:{
    ROUTE_GRAMMAR:'x=1,y=2',
    LANDMARK_REVEAL:'10.1,20.2'
  }},
  {gameId:'exact-b',verifiedRuntimePass:true,outcome:'PASS',technique:{
    ROUTE_GRAMMAR:'x=1,y=2',
    LANDMARK_REVEAL:'10.1,20.2'
  }}
]});
assert.equal(exactOnly.candidates.length,0);

const repeatedFailure=distillVibeVerifiedWorldPatterns({events:[
  {gameId:'bad-a',verifiedRuntimeFailure:true,failureReason:'SOFTLOCK',technique:failureTechnique},
  {gameId:'bad-b',verifiedRuntimeFailure:true,failureReason:'SOFTLOCK',technique:failureTechnique}
]});
assert.equal(repeatedFailure.avoid.length,1);
assert.equal(repeatedFailure.avoid[0].avoidCandidate,true);
assert.ok(repeatedFailure.avoid[0].failureReasons.includes('SOFTLOCK'));


// 절차적 자연 지형·도로·모듈 건축 배치: 정적인 제안과 실제 런타임 권한을 분리한다.
const seedWorld={seed:'rpg-mountain-1',width:24,height:24,cellSize:3,density:.8,approvedDesign:true,mobile:true};
const generated=createVibeProceduralWorldLayout(seedWorld);
assert.equal(generated.status,'STATIC_LAYOUT_PROPOSED',JSON.stringify(generated.issues));
assert.equal(generated.terrain.length,24*24);
assert.equal(generated.drainage,'FOUR_NEIGHBOR_DOWNHILL');
assert.equal(generated.regionalBiome,'TEMPERATE');
assert.ok(generated.river.length>0);
assert.ok(generated.roadCells.length>5);
assert.ok(generated.buildings.length>0);
assert.ok(generated.buildings.length<=22);
assert.ok(generated.vegetation.length>0);
assert.ok(generated.vegetation.length<=64);
assert.equal(generated.mobileBudget.vegetationLimit,64);
assert.ok(generated.routeGraph.pass);
assert.equal(generated.sourceMutationPerformed,false);
assert.equal(generated.nativeAssetInstancingPerformed,false);
assert.equal(generated.runtimeVerified,false);
assert.equal(generated.gameplayRuleMutation,false);
assert.equal(generated.saveMeaningMutation,false);
assert.deepEqual(generated,createVibeProceduralWorldLayout(seedWorld),'same seed, same 2D/3D layout');
assert.notDeepEqual(generated.terrain,createVibeProceduralWorldLayout({...seedWorld,seed:'rpg-mountain-2'}).terrain,'different seeds must change terrain');
assert.ok(generated.sightline.withinFov);
const roadKeys=new Set(generated.roadCells.map(c=>c.x+','+c.z));
const riverKeys=new Set(generated.river.map(c=>c.x+','+c.z));
const occupiedKeys=new Set();
for(const building of generated.buildings){
  assert.ok(roadKeys.has(building.roadAccess.x+','+building.roadAccess.z));
  assert.equal(building.modules.every(item=>item.startsWith(building.style+':')),true);
  assert.equal(building.modules.some(item=>item.endsWith(':DOOR')),true);
  assert.equal(building.foundation.levelY>=building.foundation.terrainMaxY,true);
  assert.equal(building.construction.verifiedStructuralEngineering,false);
  assert.equal(building.position.x%seedWorld.cellSize,0);
  assert.equal(building.position.z%seedWorld.cellSize,0);
  for(const cell of building.footprint){
    const key=cell.x+','+cell.z;
    assert.equal(roadKeys.has(key),false,'a modular building must not cover a road');
    assert.equal(riverKeys.has(key),false,'a modular building must not cover a waterway');
    assert.equal(occupiedKeys.has(key),false,'buildings must not overlap');
    occupiedKeys.add(key);
  }
}
for(const item of generated.vegetation){
  const key=item.x+','+item.z;
  assert.equal(roadKeys.has(key),false);
  assert.equal(riverKeys.has(key),false);
  assert.equal(occupiedKeys.has(key),false);
  assert.equal(item.physicsColliderGenerated,false);
}
assert.equal(generated.instancingPlan.reduce((sum,item)=>sum+item.count,0),generated.buildings.length*7+generated.vegetation.length);
assert.equal(generated.mobileBudget.actualDrawCallsMeasured,false);
assert.equal(generated.sightline.exactCameraAndOcclusionRuntimeVerified,false);
const reversedView=createVibeProceduralWorldLayout({...seedWorld,cameraForward:{x:-1,z:0}});
assert.equal(reversedView.sightline.withinFov,false);
assert.equal(reversedView.status,'LAYOUT_REVIEW_REQUIRED');
assert.equal(createVibeProceduralWorldLayout({...seedWorld,cameraForward:{x:0,z:0}}).status,'INVALID_GENERATION_INPUT');
const climateAdapted=createVibeProceduralWorldLayout({...seedWorld,climate:'COLD_WET',buildingStyle:'GOTHIC',biome:'MOUNTAIN'});
assert.ok(climateAdapted.buildings.every(item=>item.modules.some(part=>part.endsWith('PITCHED_ROOF'))));
assert.ok(climateAdapted.buildings.every(item=>item.construction.primaryMaterial==='STONE'));

const mapDriven=planVibeMapAutopilot({maps:[{name:'procedural-rpg',proceduralWorld:seedWorld}],regions:[]});
assert.ok(mapDriven.plans[0].adaptiveWorld.proceduralLayout?.roadCells?.length>0);
const optIn=createVibeAdaptiveWorldGenerationPlan({map:{name:'seeded-rpg',proceduralWorld:seedWorld}});
assert.deepEqual(optIn.proceduralLayout,generated);
assert.equal(createVibeAdaptiveWorldGenerationPlan({map:{name:'existing-live-world'}}).proceduralLayout,null);
assert.equal(createVibeProceduralWorldLayout({seed:'no-approval'}).status,'APPROVED_DESIGN_REQUIRED');
assert.equal(createVibeProceduralWorldLayout({...seedWorld,width:999}).status,'INVALID_GENERATION_INPUT');
assert.equal(createVibeProceduralWorldLayout({...seedWorld,reservedCells:[{x:999,z:0}]}).status,'INVALID_GENERATION_INPUT');
const reserved=createVibeProceduralWorldLayout({...seedWorld,reservedCells:Array.from({length:24},(_,z)=>({x:12,z}))});
assert.ok(reserved.issues.some(issue=>issue.includes('REQUIRED_ROUTE_BLOCKED')||issue.includes('REQUIRED_OBJECTIVE_UNREACHABLE')));
assert.equal(reserved.runtimeVerified,false);
const generated2D=createVibeProceduralWorldLayout({...seedWorld,dimension:'2D'});
assert.equal(generated2D.coordinateSystem,'XY_TOP_DOWN');
assert.equal(generated2D.terrain.length,generated.terrain.length);
assert.deepEqual(generated2D.roadCells,generated.roadCells);

console.log('vibe-world-macro-causality: ok');
