// 파일명: qa/vibe-world-macro-causality.mjs
// 역할: World LOD/Macro/Fate-Order-Chaos 결정성과 엔진 권한 격리를 회귀 검사
import assert from 'node:assert/strict';
import {resolveVibeWorldLod,createVibeWorldForces,createVibeMacroEventCandidate,createVibeMacroResolutionRequest,resolveVibeMacroCandidate,runVibeMacroResolutionLoop} from '../assets/vibe-orchestrator.js';

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

console.log('vibe-world-macro-causality: ok');
