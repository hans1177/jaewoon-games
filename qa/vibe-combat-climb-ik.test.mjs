import {test} from 'node:test';import assert from 'node:assert/strict';
import {createVibeDamageReceiver,checkVibeMeleeHit,solveVibeTwoBoneIK} from '../assets/vibe-combat-climb-ik.mjs';
test('damage respects invulnerability and health floor',()=>{const p=createVibeDamageReceiver({health:30,invulnerability:.5});assert.equal(p.hit(10),true);assert.equal(p.hit(10),false);p.tick(.5);assert.equal(p.hit(100),true);assert.equal(p.health,0)});
test('melee collision uses range and facing arc',()=>{const attacker={position:{x:0,y:0,z:0},forward:{x:0,z:1}};assert.equal(checkVibeMeleeHit({attacker,target:{position:{x:0,y:0,z:1}}}),true);assert.equal(checkVibeMeleeHit({attacker,target:{position:{x:0,y:0,z:-1}}}),false)});
test('two bone IK returns finite reachable elbow',()=>{const result=solveVibeTwoBoneIK({root:{x:0,y:0},target:{x:.4,y:.5},upperLength:.5,lowerLength:.5});assert.equal(result.reachable,true);assert.ok(Number.isFinite(result.elbow.x));assert.ok(Number.isFinite(result.shoulder))});
