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
test('music rejects unknown genres before creating audio',async()=>{
 const music=createVibeGenreMusic();await assert.rejects(music.start('unknown'));assert.throws(()=>music.setGenre('unknown'));
});
