import {test} from 'node:test';
import assert from 'node:assert/strict';
import {genreAssets,createVibeGenreAnimation,createVibeGenreMusic} from '../assets/vibe-genre-character-music.mjs';
test('all ten genres have original characters and musical scales',()=>{
 assert.equal(Object.keys(genreAssets).length,10);
 for(const asset of Object.values(genreAssets)){assert.ok(asset.name);assert.ok(asset.bpm>0);assert.ok(asset.scale.length>=5)}
});
test('genre animation supports authored actions and restores rest pose',()=>{
 const character={position:{y:1},rotation:{z:0}};
 const motion=createVibeGenreAnimation(character,'wuxia');motion.play('walk');motion.update(.04);
 assert.notEqual(character.position.y,1);motion.dispose();assert.equal(character.position.y,1);
 assert.throws(()=>motion.play('fly'));
});
// [캐릭터 디자인] 승인되지 않은 기본 도형 장비를 생성하지 않고 기존 의상만 되돌릴 수 있게 보정한다.
test('character art director styles existing clothing without constructing primitive gear',()=>{
 class Color{constructor(v){this.value=v}clone(){return new Color(this.value)}lerp(v,t){this.value=this.value+(v.value-this.value)*t;return this}copy(v){this.value=v.value;return this}}
 const coat={name:'coat',isMesh:true,material:{color:new Color(10)}};
 const face={name:'face',isMesh:true,material:{color:new Color(20)}};
 const model={traverse(fn){fn(coat);fn(face)}};
 const THREE={Color,Group:class{constructor(){throw Error('primitive group forbidden')}},
  Mesh:class{constructor(){throw Error('primitive geometry forbidden')}}};
 const {createVibeGenreCharacter}=await import('../assets/vibe-genre-character-music.mjs');
 const dressed=createVibeGenreCharacter(THREE,model,'wuxia');
 assert.equal(dressed.applied,1);
 assert.equal(dressed.assetCreated,false);
 assert.notEqual(coat.material.color.value,10);
 assert.equal(face.material.color.value,20);
 dressed.dispose();
 assert.equal(coat.material.color.value,10);
 assert.equal(face.material.color.value,20);
});

test('music rejects unknown genres before creating audio',async()=>{
 const music=createVibeGenreMusic();await assert.rejects(music.start('unknown'));assert.throws(()=>music.setGenre('unknown'));
});
