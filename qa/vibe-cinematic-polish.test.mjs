import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createVibeExpressionDirector,inspectVibeCharacterAsset,vibeLightingPresets} from '../assets/vibe-cinematic-polish.mjs';
test('expressions emit facial muscle channels and speech cues',()=>{
 const frames=[];const director=createVibeExpressionDirector({pose:p=>frames.push(p)});
 director.set('fear');director.update(.05,{speaking:true});
 assert.ok(frames[0].browInnerUp>.5);
 assert.ok(frames[0].jawOpen>.2);
 assert.throws(()=>director.set('unknown'));
});
test('asset inspection identifies missing rigging and UV',()=>{
 const model={traverse(fn){fn({isMesh:true,name:'Body',geometry:{attributes:{position:{count:30}}},material:{}})}};
 const report=inspectVibeCharacterAsset(model);
 assert.equal(report.triangles,10);
 assert.equal(report.missingUV[0],'Body');
 assert.ok(report.warnings.length>=2);
});
test('three lighting environments available',()=>{
 assert.deepEqual(Object.keys(vibeLightingPresets),['forest','volcano','laboratory']);
});
