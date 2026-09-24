// 파일명: qa/vibe-world-macro-causality.mjs
// 역할: World LOD/Macro/Fate-Order-Chaos 결정성과 엔진 권한 격리를 회귀 검사
import assert from 'node:assert/strict';
import {resolveVibeWorldLod,createVibeWorldForces,createVibeMacroEventCandidate,createVibeMacroResolutionRequest,resolveVibeMacroCandidate,runVibeMacroResolutionLoop} from '../assets/vibe-orchestrator.js';
import {createVibeGenreWorldGrammar,summarizeVibeVerifiedWorldLearning,createVibeReferenceImageStudyRequest,bindVibeReferenceImageObservation,createVibeReferenceMapAbstraction,createVibeMapDNA,createVibeRouteGraph,createVibeWorldStreamingPlan,createVibeAdaptiveWorldGenerationPlan} from '../assets/vibe-environment-director.js';

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

console.log('vibe-world-macro-causality: ok');
