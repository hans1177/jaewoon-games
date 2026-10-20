import assert from 'node:assert/strict';
import {test} from 'node:test';
import {bindVibeBrowserControls,createHeightfieldPhysics} from '../assets/vibe-game-input-physics.mjs';
test('keyboard movement, dodge, blur and disposal',()=>{
 const listeners=new Map(),moves=[];let dodges=0;
 const target={addEventListener(k,f){listeners.set(k,f)},removeEventListener(k){listeners.delete(k)}};
 const document={activeElement:null};
 const binding=bindVibeBrowserControls({setInput:x=>moves.push(x),dodge:()=>dodges++},{target,element:document});
 listeners.get('keydown')({code:'KeyW',repeat:false});
 assert.equal(moves.at(-1).z,1);
 listeners.get('keydown')({code:'KeyQ',repeat:false});assert.equal(dodges,1);
 listeners.get('blur')();assert.equal(moves.at(-1).z,0);
 binding.dispose();assert.equal(listeners.size,0);
});
test('heightfield terrain collision resolves ground and keeps airborne motion',()=>{
 const terrain=createHeightfieldPhysics({heightAt:()=>3});
 const land=terrain.resolve({x:0,y:4,z:0},{x:0,y:2,z:0},{y:-2});
 assert.equal(land.grounded,true);assert.equal(land.position.y,3);
 const air=terrain.resolve({x:0,y:6,z:0},{x:0,y:5,z:0},{y:-2});
 assert.equal(air.grounded,false);assert.equal(air.position.y,5);
});
