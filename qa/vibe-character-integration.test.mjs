import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {connectVibeCharacter} from '../assets/vibe-character-adapter.mjs';
const design=JSON.parse(readFileSync(new URL('../assets/vibe-visual-design-system.json',import.meta.url)));
const originalFetch=globalThis.fetch;
test('asset preview accepts its built-in smoke route but rejects unsafe external model paths',()=>{
 const source=readFileSync(new URL('../assets/vibe-model-preview.html',import.meta.url),'utf8');
 const validation=source.match(/^if\(asset&&.*$/m)?.[0];
 assert.ok(validation,'empty asset means the existing built-in preview, not a path failure');
 for(const [asset,invalid] of [['',false],['assets/hero.glb',false],['assets/../hero.glb',true],['https://other.test/hero.glb',true]]){
  let rejected=false;try{vm.runInNewContext(validation,{asset,status:{textContent:''}})}catch{rejected=true}
  assert.equal(rejected,invalid,asset||'built-in preview');
 }
 assert.doesNotMatch(source,/const performance\s*=/,'character acting cannot shadow the browser timing API');
});
function mockThree(log){
 class Action {
  constructor(name){this.name=name}
  reset(){log.push('reset:'+this.name);return this}
  fadeIn(){return this}
  fadeOut(){log.push('fadeout:'+this.name);return this}
  play(){log.push('play:'+this.name);return this}
 }
 return {AnimationMixer:class{
  clipAction(clip){return new Action(clip.name)}
  update(dt){log.push('tick:'+dt)}
  stopAllAction(){log.push('stop')}
  uncacheRoot(){log.push('dispose')}
 }};
}
test('character adapter integrates clip playback, movement, combat and cleanup',async()=>{
 const log=[];
 globalThis.fetch=async()=>({ok:true,json:async()=>design});
 try{
  const adapter=await connectVibeCharacter({character:{},clips:[{name:'idle'},{name:'walk'},{name:'sprint'},{name:'light-attack'}],THREE:mockThree(log),genre:'fantasy'});
  adapter.move({speed:.2});assert.equal(adapter.engine.state,'walk');
  adapter.move({speed:.9});assert.equal(adapter.engine.state,'sprint');
  adapter.action('light-attack');assert.equal(adapter.engine.state,'light-attack');
  adapter.update(1/30);
  assert.ok(log.includes('play:walk'));
  assert.ok(log.includes('play:sprint'));
  assert.ok(log.includes('play:light-attack'));
  assert.ok(log.some(x=>x.startsWith('tick:')));
  assert.equal(adapter.engine.consumeEvents().length,3);
  adapter.dispose();assert.ok(log.includes('dispose'));
 }finally{globalThis.fetch=originalFetch}
});
test('design schema covers genres, rig, UI and housing',()=>{
 for(const genre of ['fantasy','scifi','horror','cartoon','realistic']){
  assert.ok(design.genres[genre]?.palette?.surface);
  assert.ok(design.motionSystem.genreOverrides[genre]);
 }
 assert.ok(design.systems.housingCustomization.tools.includes('undo'));
 assert.ok(design.systems.menus.screens.includes('inventory'));
 assert.ok(design.motionSystem.rig.requiredBones.includes('hips'));
});
