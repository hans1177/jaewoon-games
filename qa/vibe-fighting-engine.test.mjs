import {test} from 'node:test';import assert from 'node:assert/strict';
import {fighters,weapons,createFightingMatch} from '../assets/vibe-fighting-engine.mjs';
test('eight unique characters with height weight face clothes and weapons',()=>{assert.equal(fighters.length,8);for(const key of ['height','weight','face','outfit','hair'])assert.equal(new Set(fighters.map(f=>f[key])).size,8);assert.equal(Object.keys(weapons).length,8)});
test('fighter can switch weapons between actions',()=>{const match=createFightingMatch();assert.equal(match.switchWeapon(0,'spear'),true);assert.equal(match.snapshot().actors[0].weapon,'spear');assert.equal(match.switchWeapon(0,'invalid'),false)});
test('attacks resolve at impact timing and reduce health',()=>{const match=createFightingMatch();for(let i=0;i<11;i++)match.step(.05,[{move:-1},{move:1}]);const before=match.snapshot().actors[1].hp;match.attack(0,'light');for(let i=0;i<12;i++)match.step(.05,[{},{}]);assert.ok(match.snapshot().actors[1].hp<before)});
test('guard mitigates incoming attacks',()=>{const match=createFightingMatch();for(let i=0;i<11;i++)match.step(.05,[{move:-1},{move:1}]);match.attack(0,'light');for(let i=0;i<12;i++)match.step(.05,[{},{guard:true}]);assert.ok(match.snapshot().actors[1].hp>=95)});
test('round timer progresses',()=>{const match=createFightingMatch({roundSeconds:2});for(let i=0;i<45;i++)match.step(.05,[{},{}]);assert.equal(match.snapshot().round,2)});

test('hit and block events record the existing attacker and target indices',()=>{
 for(const guarding of [false,true]){
  const match=createFightingMatch();
  for(let i=0;i<11;i++)match.step(.05,[{move:-1},{move:1}]);
  assert.equal(match.attack(0,'light'),true);
  for(let i=0;i<12;i++)match.step(.05,[{},guarding?{guard:true}:{}]);
  const result=match.drainEvents().find(event=>event.type===(guarding?'block':'hit'));
  assert.ok(result,'expected a real impact event');
  assert.equal(result.index,0);
  assert.equal(result.target,1);
 }
});
