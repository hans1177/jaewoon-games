import {test} from 'node:test';import assert from 'node:assert/strict';
import {createClimbMotion} from '../assets/vibe-climb-motion.mjs';
test('climb sequence reaches target landing',()=>{const avatar={position:{x:0,y:0,z:0,set(x,y,z){this.x=x;this.y=y;this.z=z}}};const climb=createClimbMotion(avatar);assert.equal(climb.begin({canGrab:true,landing:{x:1,y:1.5,z:0}}),true);for(let i=0;i<20;i++)climb.update(.1);assert.equal(climb.phase,'done');assert.equal(avatar.position.y,1.5)});
test('invalid ledge is rejected',()=>{const avatar={position:{x:0,y:0,z:0}};assert.equal(createClimbMotion(avatar).begin({canGrab:false}),false)});
